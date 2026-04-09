'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

const eventTypes = ['CONFERENCE', 'WORKSHOP', 'WEBINAR', 'FESTIVAL', 'MEETUP', 'OTHER'];

const categories = [
  'Technology',
  'Finance',
  'Health',
  'Entertainment',
  'Sports',
  'Education',
  'Marketing',
  'Sustainability',
];

const audiences = ['Students', 'Professionals', 'Entrepreneurs', 'General Public', 'Developers'];

type UploadedMedia = {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  title?: string;
  uploadedAt?: string | Date;
};

export default function CreateEventPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categories: [] as string[],
    targetAudience: [] as string[],
    location: '',
    budget: '',
    startDate: '',
    endDate: '',
    attendeeCount: '',
    eventType: 'CONFERENCE',
    image: '',
  });

  const [venueImages, setVenueImages] = useState<File[]>([]);
  const [pastEventMedia, setPastEventMedia] = useState<File[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== 'ORGANIZER') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === 'startDate' && updated.endDate && updated.endDate < value) {
        updated.endDate = '';
      }

      return updated;
    });

    if (error) setError('');
  };

  const toggleArray = (field: 'categories' | 'targetAudience', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const handleVenueImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setVenueImages(files);
  };

  const handlePastMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPastEventMedia(files);
  };

  const validateDates = () => {
    if (!formData.startDate || !formData.endDate) return true;

    if (formData.startDate < today) {
      setError('Start date cannot be in the past.');
      return false;
    }

    if (formData.endDate < today) {
      setError('End date cannot be in the past.');
      return false;
    }

    if (formData.endDate < formData.startDate) {
      setError('End date cannot be before start date.');
      return false;
    }

    return true;
  };

  const uploadFiles = async (files: File[]): Promise<UploadedMedia[]> => {
    if (!files.length) return [];

    const uploadFormData = new FormData();
    files.forEach((file) => {
      uploadFormData.append('files', file);
    });

    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(uploadData.message || 'File upload failed');
    }

    return uploadData.files || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (
      !formData.title ||
      !formData.description ||
      !formData.location ||
      !formData.budget ||
      !formData.startDate ||
      !formData.endDate
    ) {
      setError('Please fill all required fields.');
      return;
    }

    if (!validateDates()) return;

    setLoading(true);

    try {
      const uploadedVenueImages = await uploadFiles(venueImages);
      const uploadedPastMedia = await uploadFiles(pastEventMedia);

      const payload = {
        title: formData.title,
        description: formData.description,
        categories: formData.categories,
        targetAudience: formData.targetAudience,
        location: formData.location,
        budget: parseInt(formData.budget, 10),
        startDate: formData.startDate,
        endDate: formData.endDate,
        attendeeCount: parseInt(formData.attendeeCount, 10) || 100,
        eventType: formData.eventType,
        organizerId: user._id,
        coverImage: formData.image || uploadedVenueImages[0]?.url || '',
        venueImages: uploadedVenueImages,
        pastEventMedia: uploadedPastMedia,
      };

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create event');
      }

      setSuccessMessage('Event created successfully.');
      router.push(`/events/${data.event._id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-10 text-white">Loading...</div>;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_0_50px_rgba(245,158,11,0.08)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Create Event</h1>
            <p className="text-sm text-text-muted mt-2">
              Add your event details and improve sponsor trust with venue and past-event media
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-300">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Event Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Tech Summit 2026"
              required
            />

            <div>
              <label className="block mb-2 text-sm font-medium text-white">Description</label>
              <textarea
                name="description"
                placeholder="Describe your event, goals, audience, and what makes it attractive for sponsors..."
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-accent-orange/50 focus:ring-1 focus:ring-accent-orange/30 min-h-[140px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-white">Event Type</label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-[#0B1220] border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-accent-orange/50 focus:ring-1 focus:ring-accent-orange/30"
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type} className="bg-[#0B1220] text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Gurugram, Haryana"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Budget (₹)"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="50000"
                required
              />
              <Input
                label="Expected Attendees"
                name="attendeeCount"
                value={formData.attendeeCount}
                onChange={handleChange}
                placeholder="500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                min={today}
              />
              <Input
                label="End Date"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                min={formData.startDate || today}
              />
            </div>

            <div>
              <h3 className="text-white mb-3 font-semibold">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleArray('categories', cat)}
                    className={`px-3 py-2 rounded-full text-sm transition ${
                      formData.categories.includes(cat)
                        ? 'bg-accent-orange text-black'
                        : 'bg-white/5 border border-white/10 text-text-muted hover:border-accent-orange/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-white mb-3 font-semibold">Target Audience</h3>
              <div className="flex flex-wrap gap-2">
                {audiences.map((aud) => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => toggleArray('targetAudience', aud)}
                    className={`px-3 py-2 rounded-full text-sm transition ${
                      formData.targetAudience.includes(aud)
                        ? 'bg-accent-orange text-black'
                        : 'bg-white/5 border border-white/10 text-text-muted hover:border-accent-orange/40'
                    }`}
                  >
                    {aud}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block mb-2 text-sm font-medium text-white">Venue Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleVenueImagesChange}
                  className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent-orange file:px-4 file:py-2 file:text-black hover:file:brightness-110"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Upload venue photos so sponsors can verify the event space.
                </p>
                {venueImages.length > 0 && (
                  <p className="mt-2 text-xs text-green-300">
                    {venueImages.length} venue file(s) selected
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Past Event Photos / Videos
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handlePastMediaChange}
                  className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent-orange file:px-4 file:py-2 file:text-black hover:file:brightness-110"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Add previous event media to improve credibility and sponsor confidence.
                </p>
                {pastEventMedia.length > 0 && (
                  <p className="mt-2 text-xs text-green-300">
                    {pastEventMedia.length} past media file(s) selected
                  </p>
                )}
              </div>
            </div>

            <Input
              label="Featured Event Image URL (Optional)"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/cover-image.jpg"
            />

            <div className="flex gap-4 pt-4">
              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Creating...' : 'Create Event 🚀'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/dashboard')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}