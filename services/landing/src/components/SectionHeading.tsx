interface SectionHeadingProps {
  tag: string
  title: string
  description?: string
}

export default function SectionHeading({ tag, title, description }: SectionHeadingProps) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-16">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-600 border border-primary-500/20 mb-4">
        {tag}
      </span>
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-gray-500 text-lg leading-relaxed">{description}</p>
      )}
    </div>
  )
}
