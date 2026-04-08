import Link from 'next/link';

const posts = [
  {
    id: 1,
    title: 'Why Smart Sponsorship Matching Matters',
    excerpt:
      'Traditional sponsorship outreach is slow and inefficient. Here is how structured matching improves results.',
    date: 'Coming Soon',
  },
  {
    id: 2,
    title: 'How Organizers Can Attract Better Sponsors',
    excerpt:
      'A strong event profile with clear audience, budget, and positioning increases sponsor confidence.',
    date: 'Coming Soon',
  },
  {
    id: 3,
    title: 'How Sponsors Can Find the Right Events Faster',
    excerpt:
      'Brands need audience fit, category relevance, and regional alignment. Sponexus simplifies that process.',
    date: 'Coming Soon',
  },
];

export default function BlogPage() {
  return (
    <div className="relative min-h-screen px-4 py-16">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Sponexus Blog</h1>
          <p className="text-text-muted max-w-2xl mx-auto text-lg">
            Updates, ideas, and insights around sponsorship, events, and smart matching.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
            >
              <p className="text-xs text-accent-orange mb-3">{post.date}</p>
              <h2 className="text-xl font-semibold text-white mb-3">{post.title}</h2>
              <p className="text-text-muted text-sm leading-relaxed mb-5">{post.excerpt}</p>
              <Link
                href="#"
                className="text-sm text-accent-orange hover:text-yellow-400 transition"
              >
                Read more
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.05] p-8 text-center backdrop-blur-xl">
          <h2 className="text-2xl font-semibold text-white mb-3">More articles coming soon</h2>
          <p className="text-text-muted">
            We’ll publish updates as Sponexus grows and launches new features.
          </p>
        </div>
      </div>
    </div>
  );
}