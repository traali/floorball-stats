import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerFloorballWebMCP } from './mcp-app'

// Register WebMCP browser tools for AI agents (navigator.modelContext & document.modelContext)
void registerFloorballWebMCP()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
