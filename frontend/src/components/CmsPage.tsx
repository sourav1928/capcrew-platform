import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/api'
import { usePageMeta } from '../utils/usePageMeta'

/** Very small text format for owner-written pages: "# Heading", "## Sub-heading", blank line = new paragraph. */
const renderContent = (text: string) =>
  text.split(/\n{2,}/).map((block, i) => {
    const t = block.trim()
    if (t.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-3">{t.slice(3)}</h2>
    if (t.startsWith('# ')) return <h2 key={i} className="text-3xl font-bold text-gray-900 mt-8 mb-3">{t.slice(2)}</h2>
    const lines = t.split('\n')
    if (lines.every((l) => l.trim().startsWith('- '))) {
      return <ul key={i} className="list-disc ml-6 space-y-1 text-gray-700 mb-4">{lines.map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}</ul>
    }
    return <p key={i} className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{t}</p>
  })

/**
 * Shows the page the owner wrote in the admin panel. Until the owner publishes one,
 * the built-in page (children) is shown, so nothing ever goes blank.
 */
export default function CmsPage({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cms-page', slug],
    queryFn: async () => {
      try {
        return (await apiClient.getCmsPage(slug)).data.data as { title: string; content: string }
      } catch {
        return null
      }
    },
    staleTime: 60_000,
  })
  // Only when the owner has written this page; otherwise the built-in page sets its own title
  usePageMeta(data ? data.title : null, data ? data.content.replace(/[#*\n-]+/g, ' ').trim().slice(0, 155) : undefined)
  if (isLoading) return <div className="min-h-[50vh]" />
  if (!data) return <>{children}</>
  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <article className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-8 sm:p-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">{data.title}</h1>
        {renderContent(data.content)}
      </article>
    </div>
  )
}
