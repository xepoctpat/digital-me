from pathlib import Path
import os
import re
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import yaml
from lpm_kernel.common.logging import logger
from lpm_kernel.models.memory import Memory
from lpm_kernel.common.repository.database_session import DatabaseSession
from lpm_kernel.file_data.process_factory import ProcessorFactory
from lpm_kernel.file_data.document_service import DocumentService
from lpm_kernel.file_data.document_dto import CreateDocumentRequest
from .process_status import ProcessStatus
from sqlalchemy import select


class StorageService:
    def __init__(self, config):
        self.config = config
        # get raw content directory configuration
        raw_content_dir = config.get("USER_RAW_CONTENT_DIR", "resources/raw_content")
        base_dir = config.get("LOCAL_BASE_DIR", ".")

        logger.info(f"Initializing storage service, base_dir: {base_dir}")
        logger.info(f"Raw content directory configuration: {raw_content_dir}")

        # if path is not absolute, build full path based on base_dir
        if not os.path.isabs(raw_content_dir):
            # replace environment variable
            raw_content_dir = raw_content_dir.replace("${RESOURCE_DIR}", "resources")
            raw_content_dir = raw_content_dir.replace(
                "${RAW_CONTENT_DIR}", "resources/raw_content"
            )
            # build full path based on base_dir
            raw_content_dir = os.path.join(base_dir, raw_content_dir)
            logger.info(f"Building complete path: {raw_content_dir}")

        # convert to Path object and ensure directory exists
        self.base_path = Path(raw_content_dir).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Storage path created: {self.base_path}")

        self.document_service = DocumentService()

    def _decode_text_bytes(self, filename: str, raw_bytes: bytes) -> Optional[str]:
        """Decode uploaded text-like files with the same fallback strategy used on disk."""
        if Path(filename).suffix.lower() not in {".md", ".txt"}:
            return None

        for encoding in ("utf-8", "utf-8-sig", "utf-16", "latin-1"):
            try:
                return raw_bytes.decode(encoding)
            except UnicodeDecodeError:
                continue

        logger.warning(f"Unable to decode uploaded file with supported encodings: {filename}")
        return None

    def _read_text_file(self, filepath: Path) -> Optional[str]:
        """Read text-based imports with a small encoding fallback list."""
        if filepath.suffix.lower() not in {".md", ".txt"}:
            return None

        for encoding in ("utf-8", "utf-8-sig", "utf-16", "latin-1"):
            try:
                return filepath.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue
            except OSError as e:
                logger.warning(f"Failed to read file {filepath}: {str(e)}")
                return None

        logger.warning(f"Unable to decode file with supported encodings: {filepath}")
        return None

    def _parse_source_timestamp(self, value: Optional[str]) -> Optional[str]:
        """Normalize export timestamps into ISO strings when possible."""
        if not value or not isinstance(value, str):
            return None

        candidate = value.strip()
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(candidate, fmt).isoformat()
            except ValueError:
                continue

        try:
            return datetime.fromisoformat(candidate).isoformat()
        except ValueError:
            logger.warning(f"Unable to normalize source timestamp: {candidate}")
            return candidate

    def _extract_frontmatter(
        self, raw_content: str
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Extract YAML frontmatter from hosted Markdown exports."""
        normalized_content = raw_content.replace("\r\n", "\n")
        match = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", normalized_content, re.DOTALL)
        if not match:
            return None, None

        try:
            frontmatter = yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError as e:
            logger.warning(f"Failed to parse YAML frontmatter: {str(e)}")
            return None, None

        if not isinstance(frontmatter, dict):
            return None, None

        return frontmatter, match.group(2).lstrip("\n")

    def _normalize_resources(self, resources: Any) -> list[dict[str, Any]]:
        """Normalize export resources into JSON-safe dictionaries."""
        if not isinstance(resources, list):
            return []

        normalized_resources = []
        for resource in resources:
            if not isinstance(resource, dict):
                continue

            url = resource.get("url")
            if not url:
                continue

            normalized_resources.append(
                {
                    "url": url,
                    "title": resource.get("title") or "",
                    "type": resource.get("type"),
                    "process": resource.get("process"),
                }
            )

        return normalized_resources

    def _extract_import_metadata(
        self, filepath: Path, metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        """Extract hosted-export metadata and frontmatter-free content."""
        normalized_metadata: Dict[str, Any] = dict(metadata or {})
        raw_content = self._read_text_file(filepath)
        if raw_content is None:
            return normalized_metadata, None

        normalized_metadata, cleaned_content, _ = self._extract_import_metadata_from_text(
            raw_content, metadata
        )
        return normalized_metadata, cleaned_content

    def _extract_import_metadata_from_text(
        self, raw_content: str, metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, Any], Optional[str], list[str]]:
        """Extract hosted-export metadata from raw text without persisting the file."""
        normalized_metadata: Dict[str, Any] = dict(metadata or {})
        warnings: list[str] = []

        frontmatter, cleaned_content = self._extract_frontmatter(raw_content)
        if not frontmatter:
            if raw_content.lstrip().startswith("---"):
                warnings.append(
                    "Frontmatter markers were found, but the YAML block could not be parsed."
                )
            return normalized_metadata, None, warnings

        if not frontmatter.get("secondme_export"):
            if any(
                frontmatter.get(key) is not None
                for key in (
                    "doc_id",
                    "memory_type",
                    "source_type",
                    "created",
                    "modified",
                    "tags",
                    "resources",
                )
            ):
                warnings.append(
                    "Frontmatter metadata was found, but it does not declare secondme_export."
                )
            return normalized_metadata, None, warnings

        normalized_metadata.update(
            {
                "import_source": "secondme_export",
                "source_is_hosted_export": True,
                "source_export_version": str(frontmatter.get("secondme_export")),
                "source_doc_id": str(frontmatter.get("doc_id"))
                if frontmatter.get("doc_id") is not None
                else None,
                "source_title": frontmatter.get("title"),
                "source_type": frontmatter.get("source_type") or frontmatter.get("type"),
                "source_export_kind": frontmatter.get("type")
                or frontmatter.get("source_type")
                or "memory",
                "source_memory_type": frontmatter.get("memory_type"),
                "source_created_time": self._parse_source_timestamp(
                    frontmatter.get("created")
                ),
                "source_modified_time": self._parse_source_timestamp(
                    frontmatter.get("modified")
                ),
                "source_tags": [
                    str(tag) for tag in (frontmatter.get("tags") or []) if tag is not None
                ],
                "source_resources": self._normalize_resources(frontmatter.get("resources")),
            }
        )

        normalized_metadata = {
            key: value
            for key, value in normalized_metadata.items()
            if value not in (None, "")
            or key in {"source_is_hosted_export", "source_tags", "source_resources"}
        }

        cleaned_body = cleaned_content.strip() if cleaned_content else ""

        if not cleaned_body:
            warnings.append("Hosted export body is empty.")
        if not normalized_metadata.get("source_title"):
            warnings.append("Hosted export is missing a title.")
        if not normalized_metadata.get("source_created_time") and not normalized_metadata.get(
            "source_modified_time"
        ):
            warnings.append("Hosted export is missing source timestamps.")

        return normalized_metadata, cleaned_body, warnings

    def _create_preview_excerpt(self, content: Optional[str], limit: int = 240) -> Optional[str]:
        """Generate a compact single-paragraph content preview for UI review."""
        if not content:
            return None

        normalized_content = re.sub(r"\s+", " ", content).strip()
        if not normalized_content:
            return None

        if len(normalized_content) <= limit:
            return normalized_content

        return normalized_content[:limit].rstrip() + "..."

    def _build_import_preview(
        self,
        *,
        filename: str,
        filesize: int,
        metadata: Optional[Dict[str, Any]] = None,
        cleaned_content: Optional[str] = None,
        warnings: Optional[list[str]] = None,
        supported: bool = True,
        is_duplicate: bool = False,
        selection_index: Optional[int] = None,
        relative_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Build a normalized import preview payload for API consumers."""
        metadata = metadata or {}
        preview_warnings = list(warnings or [])
        source_dates = [
            value
            for value in (
                metadata.get("source_created_time"),
                metadata.get("source_modified_time"),
            )
            if value
        ]
        tags = [str(tag) for tag in (metadata.get("source_tags") or []) if tag]
        resources = metadata.get("source_resources") or []

        preview: Dict[str, Any] = {
            "name": filename,
            "title": metadata.get("source_title") or filename,
            "size": filesize,
            "size_label": f"{filesize / 1024:.1f} KB",
            "supported": supported,
            "can_import": supported and not is_duplicate,
            "is_duplicate": is_duplicate,
            "is_hosted_export": bool(metadata.get("source_is_hosted_export", False)),
            "source_export_kind": metadata.get("source_export_kind"),
            "source_memory_type": metadata.get("source_memory_type"),
            "source_created_time": metadata.get("source_created_time"),
            "source_modified_time": metadata.get("source_modified_time"),
            "tag_count": len(tags),
            "source_date_count": len(source_dates),
            "linked_resource_count": len(resources),
            "tags": tags,
            "resources": resources,
            "warnings": preview_warnings,
            "content_preview": self._create_preview_excerpt(cleaned_content),
        }

        if selection_index is not None:
            preview["selection_index"] = selection_index

        if relative_path is not None:
            preview["relative_path"] = relative_path

        return preview

    def _summarize_import_previews(self, previews: list[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate preview data into the counts needed for pre-import safety checks."""
        unique_tags = {
            tag for preview in previews for tag in (preview.get("tags") or []) if tag
        }

        return {
            "total_files": len(previews),
            "note_count": sum(1 for preview in previews if preview.get("supported")),
            "importable_files": sum(1 for preview in previews if preview.get("can_import")),
            "blocked_files": sum(1 for preview in previews if not preview.get("can_import")),
            "duplicate_files": sum(1 for preview in previews if preview.get("is_duplicate")),
            "unsupported_files": sum(1 for preview in previews if not preview.get("supported")),
            "hosted_export_files": sum(
                1 for preview in previews if preview.get("is_hosted_export")
            ),
            "name_conflict_files": sum(
                1 for preview in previews if preview.get("has_batch_name_conflict")
            ),
            "suspicious_files": sum(1 for preview in previews if preview.get("warnings")),
            "tag_count": len(unique_tags),
            "source_date_count": sum(
                int(preview.get("source_date_count") or 0) for preview in previews
            ),
            "linked_resource_count": sum(
                int(preview.get("linked_resource_count") or 0) for preview in previews
            ),
        }

    def preview_uploaded_files(
        self, files: list[Any], metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Preview one or more uploaded files before persisting them."""
        previews: list[Dict[str, Any]] = []

        for index, file in enumerate(files):
            filename = file.filename or ""
            suffix = Path(filename).suffix.lower()

            file.seek(0, os.SEEK_END)
            filesize = file.tell()
            file.seek(0)

            warnings: list[str] = []
            supported = suffix in {".txt", ".pdf", ".md"}
            normalized_metadata: Dict[str, Any] = dict(metadata or {})
            cleaned_content: Optional[str] = None
            is_duplicate = bool(self.check_file_exists(filename, filesize))

            if supported and suffix in {".md", ".txt"}:
                raw_bytes = file.read()
                file.seek(0)
                raw_content = self._decode_text_bytes(filename, raw_bytes)

                if raw_content is None:
                    warnings.append(
                        "The file could not be decoded with the supported text encodings."
                    )
                else:
                    normalized_metadata, cleaned_content, metadata_warnings = (
                        self._extract_import_metadata_from_text(raw_content, metadata)
                    )
                    warnings.extend(metadata_warnings)

            if not supported:
                warnings.append(
                    "Unsupported file format. Only .txt, .md, and .pdf can be imported."
                )

            if is_duplicate:
                warnings.insert(0, f"'{filename}' already exists locally with the same size.")

            previews.append(
                self._build_import_preview(
                    filename=filename,
                    filesize=filesize,
                    metadata=normalized_metadata,
                    cleaned_content=cleaned_content,
                    warnings=warnings,
                    supported=supported,
                    is_duplicate=is_duplicate,
                    selection_index=index,
                )
            )

        previews_by_name: Dict[str, list[Dict[str, Any]]] = {}
        for preview in previews:
            previews_by_name.setdefault(preview["name"].lower(), []).append(preview)

        for conflicting_previews in previews_by_name.values():
            if len(conflicting_previews) < 2:
                continue

            for preview in conflicting_previews:
                preview["has_batch_name_conflict"] = True
                preview["can_import"] = False
                preview["warnings"].append(
                    "Another selected file shares this filename. Browser folder uploads flatten paths, so importing both now would collide locally."
                )

        return {"files": previews, "summary": self._summarize_import_previews(previews)}

    def preview_directory_scan(self, directory_path: str, recursive: bool = False) -> Dict[str, Any]:
        """Preview a raw-content directory scan without creating documents or memories."""
        path = Path(directory_path)
        if not path.is_dir():
            raise ValueError(f"{directory_path} is not a directory")

        pattern = "**/*" if recursive else "*"
        previews: list[Dict[str, Any]] = []

        for file_path in path.glob(pattern):
            if not file_path.is_file():
                continue

            filename = file_path.name
            filesize = file_path.stat().st_size
            suffix = file_path.suffix.lower()
            warnings: list[str] = []
            supported = suffix in {".txt", ".pdf", ".md"}
            normalized_metadata: Dict[str, Any] = {}
            cleaned_content: Optional[str] = None
            is_duplicate = bool(self.check_file_exists(filename, filesize))

            if supported and suffix in {".md", ".txt"}:
                raw_content = self._read_text_file(file_path)
                if raw_content is None:
                    warnings.append(
                        "The file could not be decoded with the supported text encodings."
                    )
                else:
                    normalized_metadata, cleaned_content, metadata_warnings = (
                        self._extract_import_metadata_from_text(raw_content)
                    )
                    warnings.extend(metadata_warnings)

            if not supported:
                warnings.append(
                    "Unsupported file format. Only .txt, .md, and .pdf are imported by scan."
                )

            if is_duplicate:
                warnings.insert(0, f"'{filename}' already exists locally with the same size.")

            try:
                relative_path = str(file_path.relative_to(path))
            except ValueError:
                relative_path = str(file_path)

            previews.append(
                self._build_import_preview(
                    filename=filename,
                    filesize=filesize,
                    metadata=normalized_metadata,
                    cleaned_content=cleaned_content,
                    warnings=warnings,
                    supported=supported,
                    is_duplicate=is_duplicate,
                    relative_path=relative_path,
                )
            )

        return {
            "directory": str(path),
            "recursive": recursive,
            "files": previews,
            "summary": self._summarize_import_previews(previews),
        }

    def _build_document_description(self, metadata: Optional[Dict[str, Any]]) -> str:
        """Generate a concise document description from import metadata."""
        if metadata and metadata.get("description"):
            return metadata["description"]

        if metadata and metadata.get("source_is_hosted_export"):
            export_kind = metadata.get("source_export_kind") or "memory"
            return f"Imported hosted Second Me {export_kind} export"

        return "Uploaded document"

    def check_file_exists(self, filename: str, filesize: int) -> Memory:
        """Check if file already exists

        Args:
            filename: file name
            filesize: file size

        Returns:
            Memory: if file exists, return corresponding Memory object; otherwise return None
        """
        db = DatabaseSession()
        with db._session_factory() as session:
            # find record with same file name and size
            query = select(Memory).where(
                Memory.name == filename, Memory.size == filesize
            )
            result = session.execute(query)
            memory = result.scalar_one_or_none()

            if memory:
                logger.info(f"Found duplicate file: {filename}, size: {filesize}")
                # check if file really exists
                if os.path.exists(memory.path):
                    return memory
                logger.warning(f"File in database does not exist on disk: {memory.path}")
            return None

    def save_file(self, file, metadata=None):
        """Save file and process document

        Args:
            file: uploaded file object
            metadata: file metadata

        Returns:
            tuple: (Memory object, Document object)

        Raises:
            ValueError: if file already exists
        """
        logger.info(f"Starting to save file: {file.filename}")
        logger.debug(f"File metadata: {metadata}")

        try:
            # get file size
            file.seek(0, os.SEEK_END)
            filesize = file.tell()
            file.seek(0)  # reset file pointer to start position

            # check if file already exists
            existing_memory = self.check_file_exists(file.filename, filesize)
            if existing_memory:
                raise ValueError(f"File '{file.filename}' already exists")

            # save file to disk
            filepath, filename, filesize = self._save_file_to_disk(file)
            logger.info(f"File saved to disk: {filepath}, size: {filesize} bytes")

            normalized_metadata, cleaned_content = self._extract_import_metadata(
                filepath, metadata
            )

            # create Memory record
            memory = None
            document = None

            db = DatabaseSession()
            session = db._session_factory()
            try:
                # create and save Memory record
                memory = Memory(
                    name=filename,
                    size=filesize,
                    path=str(filepath),
                    metadata=normalized_metadata,
                )
                session.add(memory)
                session.commit()
                logger.info(f"Memory record created successfully: {memory.id}")

                # process document
                document = self._process_document(
                    filepath, normalized_metadata, cleaned_content
                )
                if document:
                    memory.document_id = document.id
                    memory.meta_data = normalized_metadata
                    session.add(memory)
                    session.commit()
                    logger.info(f"Memory record updated, associated document ID: {document.id}")

                # refresh memory object to ensure all fields are up to date
                session.refresh(memory)

            except Exception as e:
                session.rollback()
                logger.error(f"Database operation failed: {str(e)}", exc_info=True)
                raise
            finally:
                session.close()

            return memory, document

        except Exception as e:
            logger.error(f"Error occurred during file saving: {str(e)}", exc_info=True)
            raise

    def _save_file_to_disk(self, file):
        """Save file to disk

        Args:
            file: uploaded file object

        Returns:
            tuple: (file path, file name, file size)
        """
        try:
            # ensure directory exists
            self.base_path.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Ensuring storage directory exists: {self.base_path}")

            # generate file name and path
            filename = file.filename
            filepath = self.base_path / filename
            logger.info(f"Preparing to save file to: {filepath}")

            # save file
            file.save(str(filepath))
            filesize = os.path.getsize(filepath)
            logger.info(f"File saved successfully: {filepath}, size: {filesize} bytes")

            return filepath, filename, filesize

        except Exception as e:
            logger.error(f"Failed to save file to disk: {str(e)}", exc_info=True)
            raise

    def _process_document(self, filepath, metadata=None, cleaned_content: Optional[str] = None):
        """Process document and create Document record

        Args:
            filepath: file path
            metadata: file metadata

        Returns:
            Document: created Document object, return None if processing fails
        """
        try:
            logger.info(f"Starting to process document: {filepath}")
            doc = ProcessorFactory.auto_detect_and_process(str(filepath))

            if cleaned_content is not None:
                doc.raw_content = cleaned_content

            logger.info(
                f"Document processing completed, type: {doc.mime_type}, size: {doc.document_size}"
            )

            request = CreateDocumentRequest(
                name=doc.name,
                title=(
                    metadata.get("source_title")
                    or metadata.get("name")
                    or doc.name
                )
                if metadata
                else doc.name,
                mime_type=doc.mime_type,
                user_description=self._build_document_description(metadata),
                document_size=doc.document_size,
                url=str(filepath),
                raw_content=doc.raw_content,
                extract_status=doc.extract_status,
                embedding_status=ProcessStatus.INITIALIZED,
            )

            saved_doc = self.document_service.create_document(request)
            logger.info(f"Document record created: {saved_doc.id}")
            return saved_doc

        except Exception as e:
            logger.error(f"Document processing failed: {str(e)}", exc_info=True)
            return None
