import { useEffect, useState } from 'react'
import { EmptyRecordCard } from './EmptyRecordCard'
import type { SignalCategory, SignalItem } from '../types'

interface AlertFeedProps {
  signalFeed: SignalItem[]
}

const categoryLabels: Record<SignalCategory, string> = {
  weather: 'Weather',
  storm: 'Storm',
  flood: 'Flood',
  earthquake: 'Earthquake',
  wildfire: 'Wildfire',
  heat: 'Heat',
  'air-quality': 'Air quality',
  infrastructure: 'Infrastructure',
  transport: 'Transport',
  airspace: 'Airspace',
  'public-safety': 'Public safety',
  'civil-defense': 'Civil defense',
  other: 'Other',
}

function severityClass(severity: SignalItem['severity']) {
  return `severity-${severity.toLowerCase()}`
}

function categoryLabel(category: SignalItem['category']) {
  return categoryLabels[category]
}

export function AlertFeed({ signalFeed }: AlertFeedProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | SignalCategory>('all')
  const categories = [...new Set(signalFeed.map((signal) => signal.category))]
  const filteredSignals =
    activeFilter === 'all' ? signalFeed : signalFeed.filter((signal) => signal.category === activeFilter)

  useEffect(() => {
    if (activeFilter !== 'all' && !signalFeed.some((signal) => signal.category === activeFilter)) {
      setActiveFilter('all')
    }
  }, [activeFilter, signalFeed])

  return (
    <section className="panel feed-panel">
      <div className="panel-heading">
        <div>
          <div className="section-label">Signals Feed</div>
          <h2>Weather, infrastructure, transport, and public-safety signals</h2>
        </div>
        <div className="panel-heading-badge">{signalFeed.length} live items</div>
      </div>
      {categories.length > 0 ? (
        <div className="filter-row" aria-label="Signal category filters">
          <button
            className={`filter-chip ${activeFilter === 'all' ? 'filter-chip-active' : ''}`}
            type="button"
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          {categories.map((category) => {
            const count = signalFeed.filter((signal) => signal.category === category).length

            return (
              <button
                key={category}
                className={`filter-chip ${activeFilter === category ? 'filter-chip-active' : ''}`}
                type="button"
                onClick={() => setActiveFilter(category)}
              >
                {categoryLabel(category)} · {count}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="stack-list">
        {filteredSignals.length > 0 ? (
          filteredSignals.map((signal) => (
            <article key={signal.id} className="record-card">
              <div className="record-top">
                <div>
                  <div className="record-kicker">{signal.status}</div>
                  <strong>{signal.title}</strong>
                  <p>
                    {signal.issuedAt} · {signal.source}
                  </p>
                </div>
                <div className="chip-row">
                  <span className={`status-chip ${severityClass(signal.severity)}`}>{signal.severity}</span>
                  <span className="status-chip status-light">{categoryLabel(signal.category)}</span>
                </div>
              </div>
              <p>{signal.summary}</p>
              {signal.tags.length > 0 ? (
                <div className="tag-row">
                  {signal.tags.map((tag) => (
                    <span key={`${signal.id}-${tag}`} className="tag-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="record-footer">
                <span>{signal.coverage}</span>
                <span>{signal.hotspotLabel} · {signal.reactionCount} field reactions</span>
              </div>
              {signal.link ? (
                <div className="record-footer">
                  <a href={signal.link} target="_blank" rel="noreferrer">
                    Open official source
                  </a>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <EmptyRecordCard
            title="No live signals in the current briefing."
            message="The selected coverage feed is connected, but it is not reporting active weather, transport, infrastructure, or public-safety signals right now."
          />
        )}
      </div>
    </section>
  )
}
