import { CATEGORIES, categoryAccent } from '../../lib/places'

/**
 * Horizontal category filter. `value === null` means "All".
 * `counts` is an optional { [categoryId]: number } map.
 */
export default function CategoryChips({ value, onChange, counts, includeAll = true }) {
  return (
    <div className="chips" role="group" aria-label="Filter by category">
      {includeAll && (
        <button
          type="button"
          className={`chip${value === null ? ' chip--active' : ''}`}
          onClick={() => onChange(null)}
        >
          All
        </button>
      )}

      {CATEGORIES.map((category) => {
        const active = value === category.id
        return (
          <button
            key={category.id}
            type="button"
            className={`chip${active ? ' chip--active' : ''}`}
            style={{ '--chip-accent': categoryAccent(category.id) }}
            onClick={() => onChange(active ? null : category.id)}
          >
            <span className="chip__dot" />
            {category.label}
            {counts?.[category.id] != null && (
              <span style={{ color: 'var(--c-text-faint)' }}>{counts[category.id]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
