/* eslint-disable prettier/prettier */

'use client';

import type { BioVersion, GlobalBioResponse, GlobalBioShade } from '@/service/model';
import { getGlobalBio, getGlobalBioVersion } from '@/service/model';
import { Alert, Empty, Select, Skeleton, Tag } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ShadeDetailDrawer from './ShadeDetailDrawer';

const parseQueryNumber = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const normalizedValue =
    value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleString();
};

const truncateText = (value?: string | null, maxLength = 160) => {
  if (!value) {
    return '';
  }

  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`;
};

const describeShade = (shade: GlobalBioShade) => {
  return shade.desc_third_view || shade.desc_second_view || shade.content_third_view || 'No summary yet.';
};

export default function GlobalBioPanel(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [versions, setVersions] = useState<BioVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [bioData, setBioData] = useState<GlobalBioResponse | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const requestedVersion = parseQueryNumber(searchParams.get('bioVersion'));
  const selectedShadeId = parseQueryNumber(searchParams.get('shade'));

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      });

      const nextQuery = nextParams.toString();

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    let ignore = false;

    setVersionsLoading(true);
    setVersionsError(null);

    getGlobalBioVersion()
      .then((res) => {
        if (ignore) {
          return;
        }

        if (res.data.code === 0) {
          setVersions(Array.isArray(res.data.data) ? res.data.data : []);
        } else {
          setVersions([]);
          setVersionsError(res.data.message || 'Failed to load L1 versions.');
        }
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        console.error('Failed to load global bio versions', error);
        setVersions([]);
        setVersionsError('Unable to load L1 versions right now.');
      })
      .finally(() => {
        if (!ignore) {
          setVersionsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!versions.length) {
      setSelectedVersion(null);
      setBioData(null);

      return;
    }

    const resolvedVersion =
      versions.find((version) => version.version === requestedVersion)?.version ??
      versions[0].version;

    setSelectedVersion((currentVersion) => {
      return currentVersion === resolvedVersion ? currentVersion : resolvedVersion;
    });

    if (requestedVersion !== resolvedVersion) {
      updateQueryParams({ bioVersion: String(resolvedVersion), shade: null });
    }
  }, [requestedVersion, updateQueryParams, versions]);

  useEffect(() => {
    if (!selectedVersion) {
      setBioData(null);
      setBioError(null);

      return;
    }

    let ignore = false;

    setBioLoading(true);
    setBioError(null);

    getGlobalBio(selectedVersion)
      .then((res) => {
        if (ignore) {
          return;
        }

        if (res.data.code === 0) {
          setBioData(res.data.data);
        } else {
          setBioData(null);
          setBioError(res.data.message || `Failed to load L1 version ${selectedVersion}.`);
        }
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        console.error('Failed to load global bio', error);
        setBioData(null);
        setBioError('Unable to load the L1 biography right now.');
      })
      .finally(() => {
        if (!ignore) {
          setBioLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedVersion]);

  useEffect(() => {
    if (!bioData || !selectedShadeId) {
      return;
    }

    if (!bioData.bio.shades.some((shade) => shade.id === selectedShadeId)) {
      updateQueryParams({ shade: null });
    }
  }, [bioData, selectedShadeId, updateQueryParams]);

  const selectedVersionMeta = useMemo(() => {
    return versions.find((version) => version.version === selectedVersion);
  }, [selectedVersion, versions]);

  const totalTimelineEntries = useMemo(() => {
    return bioData?.bio.shades.reduce((sum, shade) => sum + shade.timeline_count, 0) || 0;
  }, [bioData]);

  const linkedMemoryCount = useMemo(() => {
    if (!bioData) {
      return 0;
    }

    const ids = new Set<number>();

    bioData.bio.shades.forEach((shade) => {
      (shade.cluster_info.memoryIds || []).forEach((memoryId) => {
        const normalizedId = Number(memoryId);

        if (!Number.isNaN(normalizedId)) {
          ids.add(normalizedId);
        }
      });

      shade.timelines.forEach((timeline) => {
        if (timeline.refMemoryId !== null) {
          ids.add(timeline.refMemoryId);
        }
      });
    });

    return ids.size;
  }, [bioData]);

  const handleVersionChange = (nextVersion: number) => {
    setSelectedVersion(nextVersion);
    updateQueryParams({ bioVersion: String(nextVersion), shade: null });
  };

  const handleShadeOpen = (shadeId: number) => {
    updateQueryParams({ shade: String(shadeId) });
  };

  const handleShadeClose = () => {
    updateQueryParams({ shade: null });
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Shades & note provenance</h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Browse the generated L1 biography, then drill from each shade back into the related
            notes and chronology — hosted-style, but local-first.
          </p>
        </div>

        {versions.length ? (
          <div className="min-w-[240px]">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Version
            </div>
            <Select
              className="w-full"
              onChange={handleVersionChange}
              options={versions.map((version) => ({
                label: `Version ${version.version} • ${formatDisplayDate(version.create_time)}`,
                value: version.version
              }))}
              value={selectedVersion ?? undefined}
            />
          </div>
        ) : null}
      </div>

      {versionsError ? (
        <Alert className="mt-4" message={versionsError} showIcon type="error" />
      ) : null}

      {versionsLoading ? (
        <div className="mt-6 space-y-4">
          <Skeleton active paragraph={{ rows: 4 }} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton active paragraph={{ rows: 5 }} />
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        </div>
      ) : !versions.length ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
          <Empty
            description="No L1 shades yet. Complete at least one training run to generate a biography and note provenance view."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : bioLoading ? (
        <div className="mt-6 space-y-4">
          <Skeleton active paragraph={{ rows: 5 }} />
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : bioError ? (
        <Alert className="mt-6" message={bioError} showIcon type="error" />
      ) : bioData ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Current version</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {selectedVersionMeta?.version ?? selectedVersion}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {formatDisplayDate(selectedVersionMeta?.create_time)}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Generated shades</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {bioData.bio.shades.length}
              </div>
              <div className="mt-1 text-sm text-gray-500">Clustered identity themes</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Linked notes</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{linkedMemoryCount}</div>
              <div className="mt-1 text-sm text-gray-500">
                {totalTimelineEntries} timeline references
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900">Biography snapshot</h4>
              <Tag color="blue">Version {bioData.version}</Tag>
            </div>

            <ReactMarkdown
              className="mt-3 text-sm leading-7 text-gray-700 [&>*+*]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              remarkPlugins={[remarkGfm]}
            >
              {bioData.bio.summary_third_view ||
                bioData.bio.summary ||
                'No biography summary available yet.'}
            </ReactMarkdown>

            {bioData.bio.content_third_view || bioData.bio.content ? (
              <details className="mt-4 rounded-lg border border-white bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  View full synthesized narrative
                </summary>
                <ReactMarkdown
                  className="mt-3 text-sm leading-7 text-gray-700 [&>*+*]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                  remarkPlugins={[remarkGfm]}
                >
                  {bioData.bio.content_third_view || bioData.bio.content || ''}
                </ReactMarkdown>
              </details>
            ) : null}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-semibold text-gray-900">Generated shades</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Open a shade to inspect the related notes, resources, and chronological timeline.
                </p>
              </div>

              {selectedShadeId ? <Tag color="processing">Detail drawer open</Tag> : null}
            </div>

            {bioData.bio.shades.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {bioData.bio.shades.map((shade) => {
                  const isSelected = selectedShadeId === shade.id;

                  return (
                    <button
                      key={shade.id}
                      className={`rounded-xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-200'
                          : 'border-gray-200 bg-white hover:border-blue-200'
                      }`}
                      onClick={() => handleShadeOpen(shade.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl">
                            {shade.icon || '🧩'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="truncate text-base font-semibold text-gray-900">
                                {shade.name || 'Untitled shade'}
                              </h5>
                              {shade.aspect ? <Tag>{shade.aspect}</Tag> : null}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                              <span className="rounded-full bg-gray-100 px-2 py-1">
                                {shade.timeline_count} timeline entries
                              </span>
                              <span className="rounded-full bg-gray-100 px-2 py-1">
                                {shade.cluster_memory_count} cluster note ids
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-sm font-medium text-blue-600">Browse →</span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-gray-600">
                        {truncateText(describeShade(shade))}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
                <Empty
                  description="This version has a biography but no stored shades yet."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      <ShadeDetailDrawer
        onClose={handleShadeClose}
        open={!!selectedVersion && !!selectedShadeId}
        shadeId={selectedShadeId}
        version={selectedVersion}
      />
    </div>
  );
}