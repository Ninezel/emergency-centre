import type { ReactNode } from 'react'
import { EmptyRecordCard } from './EmptyRecordCard'
import { formatTemperature, formatWindSpeed } from '../lib/units'
import type { LocationBriefing, NewsItem, ReadinessAction, SourceHealth, UnitSystem } from '../types'

interface SituationPanelsProps {
  briefing: LocationBriefing
  unitSystem: UnitSystem
}

interface StackSectionProps<T> {
  title: string
  heading: string
  items: T[]
  emptyTitle: string
  emptyMessage: string
  renderItem: (item: T) => ReactNode
}

function StackSection<T>({
  title,
  heading,
  items,
  emptyTitle,
  emptyMessage,
  renderItem,
}: StackSectionProps<T>) {
  return (
    <section className="panel">
      <div className="section-label">{title}</div>
      <h2>{heading}</h2>
      <div className="stack-list">
        {items.length > 0 ? items.map(renderItem) : <EmptyRecordCard title={emptyTitle} message={emptyMessage} />}
      </div>
    </section>
  )
}

export function SituationPanels({ briefing, unitSystem }: SituationPanelsProps) {
  return (
    <div className="situation-grid">
      <section className="panel">
        <div className="section-label">Environmental Snapshot</div>
        <h2>{briefing.weather.condition}</h2>
        <div className="weather-grid">
          <article className="stat-tile">
            <span>Temperature</span>
            <strong>{formatTemperature(briefing.weather, unitSystem)}</strong>
          </article>
          <article className="stat-tile">
            <span>Wind</span>
            <strong>{formatWindSpeed(briefing.weather, unitSystem)}</strong>
          </article>
          <article className="stat-tile">
            <span>Rain chance</span>
            <strong>{briefing.weather.rainChance}%</strong>
          </article>
        </div>
        <p className="panel-copy">{briefing.weather.advisory}</p>
        <p className="panel-copy">{briefing.selectedLocation.profile.freshness.message}</p>
      </section>

      <StackSection<NewsItem>
        title="Context Bulletins"
        heading="Public and partner briefings around the selected location"
        items={briefing.newsFeed}
        emptyTitle="No public or partner bulletins are active."
        emptyMessage="This feed has not published local, regional, or partner briefing items in the current sync window."
        renderItem={(news) => (
          <article key={news.id} className="record-card compact-card">
            <div className="record-top">
              <div>
                <strong>{news.headline}</strong>
                <p>
                  {news.publishedAt} · {news.source}
                </p>
              </div>
              <span className="status-chip status-light">{news.scope}</span>
            </div>
            <p>{news.summary}</p>
            {news.link ? (
              <div className="record-footer">
                <a href={news.link} target="_blank" rel="noreferrer">
                  Open source update
                </a>
              </div>
            ) : null}
          </article>
        )}
      />

      <StackSection<ReadinessAction>
        title="Response Actions"
        heading="What people should do next"
        items={briefing.actions}
        emptyTitle="No response actions were published."
        emptyMessage="Add operational guidance to your feed if you want people to see clear next steps here."
        renderItem={(action) => (
          <article key={action.id} className="record-card compact-card">
            <strong>{action.title}</strong>
            <p>{action.description}</p>
            <div className="record-footer">
              <span>{action.whenToUse}</span>
            </div>
          </article>
        )}
      />

      <StackSection<SourceHealth>
        title="Source Audit"
        heading="Signal health and trust posture"
        items={briefing.sourceHealth}
        emptyTitle="No source audit entries were published."
        emptyMessage="Include source-health records in the feed if you want users to understand what is verified and fresh."
        renderItem={(source) => (
          <article key={source.id} className="record-card compact-card">
            <div className="record-top">
              <div>
                <strong>{source.name}</strong>
                <p>
                  {source.type} · {source.method ?? 'Verified feed'} · last sync {source.lastSync}
                </p>
              </div>
              <span className="status-chip status-light">{source.status}</span>
            </div>
            <p>{source.note}</p>
            {source.link ? (
              <div className="record-footer">
                <span>{source.fetchedAt ? `Fetched ${source.fetchedAt}` : 'Fetched from source'}</span>
                <a href={source.link} target="_blank" rel="noreferrer">
                  Open source
                </a>
              </div>
            ) : null}
          </article>
        )}
      />
    </div>
  )
}
