/* eslint-disable prettier/prettier */

'use client';

import type { GlobalBioShadeDetailResponse, RelatedShadeMemory } from '@/service/model';
import { getGlobalBioShadeDetail } from '@/service/model';
import { Alert, Button, Drawer, Empty, Modal, Skeleton, Tag } from 'antd';
import 'github-markdown-css/github-markdown.css';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ShadeDetailDrawerProps {
	open: boolean;
	onClose: () => void;
	version?: number | null;
	shadeId?: number | null;
}

type RelatedResource = NonNullable<RelatedShadeMemory['source_resources']>[number];

const formatDisplayDate = (value?: string | null) => {
	if (!value) {
		return '—';
	}

	const normalizedValue =
		value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
	const parsedDate = new Date(normalizedValue);

	return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleString();
};

const truncateText = (value?: string | null, maxLength = 220) => {
	if (!value) {
		return '';
	}

	return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`;
};

const getMemoryTitle = (memory: RelatedShadeMemory) => {
	return memory.source_title || memory.title || memory.name || `Memory ${memory.id}`;
};

const getMemorySubtitle = (memory: RelatedShadeMemory) => {
	const title = getMemoryTitle(memory);

	if (memory.name && memory.name !== title) {
		return memory.name;
	}

	return null;
};

const getPrimaryDate = (memory: RelatedShadeMemory) => {
	return memory.source_created_time || memory.create_time;
};

const getMemoryPreview = (memory: RelatedShadeMemory) => {
	return truncateText(memory.raw_content || memory.user_description, 280);
};

const getTimelineText = (
	timeline: Pick<
		GlobalBioShadeDetailResponse['shade']['timelines'][number],
		'descThirdView' | 'descSecondView'
	>
) => {
	return timeline.descThirdView || timeline.descSecondView || 'Related note in this shade timeline';
};

const isImageResource = (resource: RelatedResource) => {
	if ((resource.type || '').toUpperCase() === 'IMAGE') {
		return true;
	}

	return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(resource.url);
};

export default function ShadeDetailDrawer({
	open,
	onClose: handleClose,
	version,
	shadeId
}: ShadeDetailDrawerProps): JSX.Element {
	const [detail, setDetail] = useState<GlobalBioShadeDetailResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedMemory, setSelectedMemory] = useState<RelatedShadeMemory | null>(null);

	useEffect(() => {
		if (!open || !version || !shadeId) {
			if (!open) {
				setDetail(null);
				setError(null);
				setSelectedMemory(null);
			}

			return;
		}

		let ignore = false;

		setLoading(true);
		setError(null);
		setSelectedMemory(null);

		getGlobalBioShadeDetail(version, shadeId)
			.then((res) => {
				if (ignore) {
					return;
				}

				if (res.data.code === 0) {
					setDetail(res.data.data);
				} else {
					setDetail(null);
					setError(res.data.message || 'Failed to load shade detail.');
				}
			})
			.catch((requestError) => {
				if (ignore) {
					return;
				}

				console.error('Failed to load shade detail', requestError);
				setDetail(null);
				setError('Unable to load shade detail right now.');
			})
			.finally(() => {
				if (!ignore) {
					setLoading(false);
				}
			});

		return () => {
			ignore = true;
		};
	}, [open, shadeId, version]);

	const relatedMemoryMap = useMemo(() => {
		return new Map((detail?.related_memories || []).map((memory) => [memory.id, memory]));
	}, [detail?.related_memories]);

	const renderResources = (
		resources?: RelatedShadeMemory['source_resources'],
		altSeed?: string,
		compact = false
	) => {
		if (!resources?.length) {
			return null;
		}

		return (
			<div className={`grid gap-3 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
				{resources.map((resource) => (
					<a
						key={`${altSeed || 'resource'}-${resource.url}`}
						className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm"
						href={resource.url}
						rel="noreferrer"
						target="_blank"
					>
						{isImageResource(resource as RelatedResource) ? (
							<img
								alt={resource.title || altSeed || 'Memory resource'}
								className={`w-full object-cover ${compact ? 'h-24' : 'h-40'}`}
								src={resource.url}
							/>
						) : null}

						<div className="p-3 text-xs text-gray-600">
							<div className="font-medium text-gray-800">
								{resource.title || resource.type || 'Resource'}
							</div>
							<div className="mt-1 break-all">{resource.url}</div>
						</div>
					</a>
				))}
			</div>
		);
	};

	return (
		<>
			<Drawer
				destroyOnClose
				onClose={handleClose}
				open={open}
				title={detail ? detail.shade.name || `Shade ${detail.shade.id}` : 'Shade provenance'}
				width={860}
			>
				{loading ? (
					<div className="space-y-4">
						<Skeleton active paragraph={{ rows: 4 }} />
						<Skeleton active paragraph={{ rows: 8 }} />
						<Skeleton active paragraph={{ rows: 6 }} />
					</div>
				) : error ? (
					<Alert message={error} showIcon type="error" />
				) : !detail ? (
					<Empty description="No shade detail available yet." />
				) : (
					<div className="space-y-6 pb-8">
						<div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="flex items-start gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
										{detail.shade.icon || '🧩'}
									</div>

									<div>
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="text-xl font-semibold text-gray-900">
												{detail.shade.name || 'Untitled shade'}
											</h3>
											{detail.shade.aspect ? <Tag color="blue">{detail.shade.aspect}</Tag> : null}
										</div>
										<p className="mt-1 text-sm text-gray-600">
											Hosted-like drilldown for chronology and note provenance in local Second Me.
										</p>
									</div>
								</div>

								<Tag color="default">Version {detail.version}</Tag>
							</div>

							<div className="mt-4 grid gap-3 md:grid-cols-3">
								<div className="rounded-lg border border-white bg-white p-3 shadow-sm">
									<div className="text-xs uppercase tracking-wide text-gray-500">
										Timeline entries
									</div>
									<div className="mt-1 text-2xl font-semibold text-gray-900">
										{detail.shade.timeline_count}
									</div>
								</div>

								<div className="rounded-lg border border-white bg-white p-3 shadow-sm">
									<div className="text-xs uppercase tracking-wide text-gray-500">
										Loaded related notes
									</div>
									<div className="mt-1 text-2xl font-semibold text-gray-900">
										{detail.related_memory_count}
									</div>
								</div>

								<div className="rounded-lg border border-white bg-white p-3 shadow-sm">
									<div className="text-xs uppercase tracking-wide text-gray-500">
										Cluster memory ids
									</div>
									<div className="mt-1 text-2xl font-semibold text-gray-900">
										{detail.shade.cluster_memory_count}
									</div>
								</div>
							</div>
						</div>

						{detail.shade.desc_third_view ||
						detail.shade.content_third_view ||
						detail.shade.desc_second_view ||
						detail.shade.content_second_view ? (
							<section className="space-y-4">
								<div>
									<h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
										Shade narrative
									</h4>
									<div className="mt-2 rounded-xl border border-gray-200 bg-white p-5">
										<ReactMarkdown
											className="text-sm leading-7 text-gray-700 [&>*+*]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
											remarkPlugins={[remarkGfm]}
										>
											{detail.shade.desc_third_view ||
												detail.shade.desc_second_view ||
												'No summary available.'}
										</ReactMarkdown>

										{detail.shade.content_third_view || detail.shade.content_second_view ? (
											<details className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
												<summary className="cursor-pointer text-sm font-medium text-gray-700">
													View full shade description
												</summary>
												<ReactMarkdown
													className="mt-3 text-sm leading-7 text-gray-700 [&>*+*]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
													remarkPlugins={[remarkGfm]}
												>
													{detail.shade.content_third_view ||
														detail.shade.content_second_view ||
														''}
												</ReactMarkdown>
											</details>
										) : null}
									</div>
								</div>
							</section>
						) : null}

						{detail.missing_memory_ids.length ? (
							<Alert
								message={`Some related notes could not be loaded (${detail.missing_memory_ids.join(', ')}).`}
								showIcon
								type="warning"
							/>
						) : null}

						<section>
							<div className="mb-3 flex items-center justify-between gap-3">
								<div>
									<h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
										Chronology
									</h4>
									<p className="mt-1 text-sm text-gray-600">
										Ordered from earliest to latest so the shade reads like a note-backed story.
									</p>
								</div>
								<Tag color="processing">Oldest → Newest</Tag>
							</div>

							{detail.shade.timelines.length ? (
								<div className="space-y-3">
									{detail.shade.timelines.map((timeline, index) => {
										const relatedMemory =
											timeline.refMemoryId !== null
												? relatedMemoryMap.get(timeline.refMemoryId)
												: undefined;

										return (
											<div
												key={`${timeline.refMemoryId ?? 'timeline'}-${timeline.createTime}-${index}`}
												className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4"
											>
												<div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-blue-500" />
												<div className="min-w-0 flex-1">
													<div className="text-xs font-medium uppercase tracking-wide text-gray-500">
														{formatDisplayDate(timeline.createTime)}
														{timeline.refMemoryId !== null
															? ` • Memory ${timeline.refMemoryId}`
															: ''}
													</div>
													<div className="mt-1 text-sm leading-6 text-gray-800">
														{getTimelineText(timeline)}
													</div>

													{timeline.descSecondView &&
													timeline.descSecondView !== timeline.descThirdView ? (
														<div className="mt-2 text-xs leading-5 text-gray-500">
															{timeline.descSecondView}
														</div>
													) : null}

													{relatedMemory ? (
														<button
															className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
															onClick={() => setSelectedMemory(relatedMemory)}
															type="button"
														>
															Open related note →
														</button>
													) : null}
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<Empty
									description="This shade has no timeline entries yet."
									image={Empty.PRESENTED_IMAGE_SIMPLE}
								/>
							)}
						</section>

						<section>
							<div className="mb-3">
								<h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
									Related notes
								</h4>
								<p className="mt-1 text-sm text-gray-600">
									Note cards linked to this shade through timelines and cluster provenance.
								</p>
							</div>

							{detail.related_memories.length ? (
								<div className="space-y-4">
									{detail.related_memories.map((memory) => (
										<div
											key={memory.id}
											className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
										>
											<div className="flex flex-wrap items-start justify-between gap-4">
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														<h5 className="text-base font-semibold text-gray-900">
															{getMemoryTitle(memory)}
														</h5>
														{memory.source_memory_type ? <Tag>{memory.source_memory_type}</Tag> : null}
														{memory.source_is_hosted_export ? (
															<Tag color="blue">Hosted import</Tag>
														) : null}
													</div>

													{getMemorySubtitle(memory) ? (
														<div className="mt-1 text-xs text-gray-500">
															{getMemorySubtitle(memory)}
														</div>
													) : null}

													<div className="mt-2 text-xs uppercase tracking-wide text-gray-500">
														{formatDisplayDate(getPrimaryDate(memory))}
														{memory.create_time && memory.source_created_time ? (
															<span> • Imported {formatDisplayDate(memory.create_time)}</span>
														) : null}
													</div>
												</div>

												<Button onClick={() => setSelectedMemory(memory)} type="primary">
													Open note
												</Button>
											</div>

											{memory.source_tags?.length ? (
												<div className="mt-3 flex flex-wrap gap-1.5">
													{memory.source_tags.map((tag) => (
														<span
															key={`${memory.id}-${tag}`}
															className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
														>
															{tag}
														</span>
													))}
												</div>
											) : null}

											{memory.timeline_entries.length ? (
												<div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
													<div className="font-medium text-gray-700">Why this note is linked</div>
													<ul className="mt-2 list-disc space-y-1 pl-5">
														{memory.timeline_entries.map((timeline, index) => (
															<li key={`${memory.id}-timeline-${index}`}>
																<span className="font-medium text-gray-700">
																	{formatDisplayDate(timeline.createTime)}:
																</span>{' '}
																{getTimelineText(timeline)}
															</li>
														))}
													</ul>
												</div>
											) : null}

											{getMemoryPreview(memory) ? (
												<p className="mt-4 text-sm leading-6 text-gray-700">
													{getMemoryPreview(memory)}
												</p>
											) : null}

											{memory.source_resources?.length ? (
												<div className="mt-4">
													{renderResources(
														memory.source_resources.slice(0, 3),
														getMemoryTitle(memory),
														true
													)}
												</div>
											) : null}
										</div>
									))}
								</div>
							) : (
								<Empty
									description="No related notes were available for this shade yet."
									image={Empty.PRESENTED_IMAGE_SIMPLE}
								/>
							)}
						</section>
					</div>
				)}
			</Drawer>

			<Modal
				destroyOnClose
				footer={null}
				onCancel={() => setSelectedMemory(null)}
				open={!!selectedMemory}
				title={selectedMemory ? getMemoryTitle(selectedMemory) : 'Related note'}
				width={920}
			>
				{selectedMemory ? (
					<div className="space-y-4 p-1">
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
							<div className="grid gap-2 md:grid-cols-2">
								<div>
									<span className="font-medium text-gray-700">Source date:</span>{' '}
									{formatDisplayDate(getPrimaryDate(selectedMemory))}
								</div>
								<div>
									<span className="font-medium text-gray-700">Imported:</span>{' '}
									{formatDisplayDate(selectedMemory.create_time)}
								</div>

								{selectedMemory.source_modified_time ? (
									<div>
										<span className="font-medium text-gray-700">Modified:</span>{' '}
										{formatDisplayDate(selectedMemory.source_modified_time)}
									</div>
								) : null}

								{selectedMemory.source_memory_type ? (
									<div>
										<span className="font-medium text-gray-700">Memory type:</span>{' '}
										{selectedMemory.source_memory_type}
									</div>
								) : null}
							</div>

							{selectedMemory.source_tags?.length ? (
								<div className="mt-3 flex flex-wrap gap-1.5">
									{selectedMemory.source_tags.map((tag) => (
										<span
											key={`detail-${selectedMemory.id}-${tag}`}
											className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
										>
											{tag}
										</span>
									))}
								</div>
							) : null}
						</div>

						{selectedMemory.timeline_entries.length ? (
							<div className="rounded-lg border border-gray-100 bg-blue-50 p-4 text-sm text-blue-800">
								<div className="font-medium">Referenced in this shade timeline</div>
								<ul className="mt-2 list-disc space-y-1 pl-5">
									{selectedMemory.timeline_entries.map((timeline, index) => (
										<li key={`modal-timeline-${selectedMemory.id}-${index}`}>
											<span className="font-medium">
												{formatDisplayDate(timeline.createTime)}:
											</span>{' '}
											{getTimelineText(timeline)}
										</li>
									))}
								</ul>
							</div>
						) : null}

						{selectedMemory.source_resources?.length ? (
							<div className="space-y-3">
								<h4 className="text-sm font-semibold text-gray-800">Linked resources</h4>
								{renderResources(selectedMemory.source_resources, getMemoryTitle(selectedMemory))}
							</div>
						) : null}

						<div className="markdown-body rounded-lg border border-gray-200 bg-white p-6">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{selectedMemory.raw_content ||
									selectedMemory.user_description ||
									'No content available for this note.'}
							</ReactMarkdown>
						</div>
					</div>
				) : null}
			</Modal>
		</>
	);
}