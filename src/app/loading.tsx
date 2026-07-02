export default function Loading() {
  return (
    <div className="global-loading" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>Loading...</span>
    </div>
  )
}
