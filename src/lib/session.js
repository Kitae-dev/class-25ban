export function getSessionId() {
  let id = localStorage.getItem('class_session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('class_session_id', id)
  }
  return id
}
