'use client'

import Editor from "@monaco-editor/react"
import { useRef } from "react"

interface CodeEditorProps {
  starterCode: string
  onChange?: (value: string) => void
  readOnly?: boolean
  isRunning?: boolean
  hasError?: boolean
}

export default function CodeEditor({ starterCode, onChange, readOnly = false, isRunning = false, hasError = false }: CodeEditorProps) {
  // FIX: Added <any> so it can hold the Editor object
  const editorRef = useRef<any>(null)

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor

    const domNode = editor.getDomNode()

    // 1. Block right click to prevent manual copy/pasting menu
    domNode.addEventListener('contextmenu', (e: Event) => {
      e.preventDefault()
    })

    // 2. Block default Ctrl+C / Ctrl+V
    domNode.addEventListener('keydown', (e: KeyboardEvent) => {
      const isMacCmd = e.metaKey
      const isWinCtrl = e.ctrlKey
      const isCopyPaste = e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'v'

      // If they press command/ctrl + c/v WITHOUT Shift
      if ((isMacCmd || isWinCtrl) && isCopyPaste && !e.shiftKey) {
        e.stopPropagation()
        e.preventDefault()
      }
    }, true) // Use capture phase to intercept before Monaco handles it
  }

  return (
    <div className="w-full h-full machine-bezel overflow-hidden flex flex-col">
      {/* MACHINE TOP BAR — Retro arcade cabinet style */}
      <div className="bg-gradient-to-b from-[#3a3a4a] to-[#2d2d35] px-4 py-2.5 flex items-center justify-between border-b border-black/50 shrink-0">
        <div className="flex items-center gap-3">
          {/* Status LED */}
          <div className={isRunning ? 'led-yellow' : hasError ? 'led-red' : 'led-green'} />
          <span className="text-[10px] font-pixel text-gray-400 uppercase tracking-widest">
            {isRunning ? 'EXECUTING' : hasError ? 'ERROR' : 'READY'}
          </span>
        </div>
        {/* File label plate */}
        <div className="bg-black/30 px-3 py-1 rounded border border-white/10">
          <span className="text-[10px] text-gray-500 font-mono tracking-wider">main.py</span>
        </div>
        {/* Decorative screws */}
        <div className="flex gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 border border-gray-600 shadow-inner" />
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 border border-gray-600 shadow-inner" />
        </div>
      </div>

      {/* SCREEN AREA — CRT inset with scanlines and glare */}
      <div className="flex-grow relative machine-screen-inset m-1.5 crt-screen screen-glare overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={starterCode}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: readOnly,
            fontFamily: "'Courier New', monospace",
            cursorBlinking: 'smooth',
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
          }}
          onMount={handleEditorDidMount}
          onChange={(value) => onChange && onChange(value || "")}
        />
      </div>

      {/* MACHINE BOTTOM PLATE — Ventilation grille */}
      <div className="bg-gradient-to-t from-[#1a1a24] to-[#252530] px-4 py-1.5 flex items-center justify-center gap-1 border-t border-white/5 shrink-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-6 h-[2px] bg-gray-700 rounded-full" />
        ))}
      </div>
    </div>
  )
}