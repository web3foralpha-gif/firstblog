type StructuredDataProps = {
  data: Record<string, unknown> | Array<Record<string, unknown> | null | undefined> | null | undefined
}

function serializeJsonLd(data: StructuredDataProps['data']) {
  if (!data) return ''

  const payload = Array.isArray(data) ? data.filter(Boolean) : data
  if (Array.isArray(payload) && payload.length === 0) return ''

  return JSON.stringify(payload).replace(/</g, '\\u003c')
}

export default function StructuredData({ data }: StructuredDataProps) {
  const json = serializeJsonLd(data)
  if (!json) return null

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
