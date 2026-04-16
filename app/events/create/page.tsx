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

const sponsorValueOptions = [
  'Banner placement',
  'Stage speaking opportunity',
  'Stall / booth space',
  'Social media promotion',
  'Logo on posters',
];

type UploadedMedia = {
  url: string;
  publicId: string;
  type: 'image' | 'video';
};

export default function CreateEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    organizerProvides: [] as string[],
  });

  const [eventImages, setEventImages] = useState<File[]>([]);
  const [eventVideo, setEventVideo] = useState<File | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'ORGANIZER') {
      router.push('/dashboard/sponsor');
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

  const toggleOrganizerProvides = (value: string) => {
    setFormData((prev) => {
      const exists = prev.organizerProvides.includes(value);
      if (exists) {
        return {
          ...prev,
          organizerProvides: prev.organizerProvides.filter((item) => item !== value),
        };
      }

      if (prev.organizerProvides.length >= 5) {
        setError('You can choose up to 5 sponsor value options.');
        return prev;
      }

      return {
        ...prev,
        organizerProvides: [...prev.organizerProvides, value],
      };
    });
  };

  const uploadFiles = async (files: File[]): Promise<UploadedMedia[]> => {
    if (!files.length) return [];

    const uploadFormData = new FormData();
    files.forEach((file) => uploadFormData.append('files', file));

    const res = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Upload failed');
    }

    return data.files || [];
  };

  const validateForm = () => {
    if (
      !formData.title ||
      !formData.description ||
      !formData.location ||
      !formData.budget ||
      !formData.startDate ||
      !formData.endDate
    ) {
      return 'Please fill all required fields.';
    }

    if (formData.categories.length === 0) {
      return 'Please choose at least one category.';
    }

    if (eventImages.length < 3 || eventImages.length > 5) {
      return 'Please upload 3 to 5 event images.';
    }

    if (formData.organizerProvides.length === 0) {
      return 'Select at least one value you provide to sponsors.';
    }

    if (formData.startDate < today || formData.endDate < today) {
      return 'Event dates cannot be in the past.';
    }

    if (formData.endDate < formData.startDate) {
      return 'End date cannot be before start date.';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const uploadedImages = await uploadFiles(eventImages);
      const uploadedVideo = eventVideo ? await uploadFiles([eventVideo]) : [];

      const imageUrls = uploadedImages.filter((file) => file.type === 'image').map((file) => file.url);
      const videoUrl = uploadedVideo.find((file) => file.type === 'video')?.url || '';

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
        image: imageUrls[0] || '',
        images: imageUrls,
        video: videoUrl,
        organizerProvides: formData.organizerProvides,
      };

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create event');

      router.push(`/events/${data.event._id}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while creating your event.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="container-custom mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-bold text-white">Create Event</h1>
        <p className="mt-2 text-sm text-text-muted">
          Publish a sponsor-ready event with media proof and sponsor value details.
        </p>

        {error && <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Input label="Event Name" name="title" value={formData.title} onChange={handleChange} required />

          <div>
            <label className="mb-2 block text-sm text-text-muted">Category *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleArray('categories', category)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    formData.categories.includes(category)
                      ? 'border-accent-orange bg-accent-orange/20 text-accent-orange'
                      : 'border-white/15 bg-white/5 text-text-light'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-muted">Target Audience</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {audiences.map((audience) => (
                <button
                  key={audience}
                  type="button"
                  onClick={() => toggleArray('targetAudience', audience)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    formData.targetAudience.includes(audience)
                      ? 'border-blue-400 bg-blue-400/20 text-blue-300'
                      : 'border-white/15 bg-white/5 text-text-light'
                  }`}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Location" name="location" value={formData.location} onChange={handleChange} required />
            <Input label="Budget Needed (₹)" name="budget" type="number" value={formData.budget} onChange={handleChange} required />
            <Input label="Start Date" name="startDate" type="date" min={today} value={formData.startDate} onChange={handleChange} required />
            <Input label="End Date" name="endDate" type="date" min={formData.startDate || today} value={formData.endDate} onChange={handleChange} required />
            <Input label="Expected Audience" name="attendeeCount" type="number" value={formData.attendeeCount} onChange={handleChange} />
            <div>
              <label className="mb-2 block text-sm text-text-muted">Event Type</label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/10 bg-dark-layer p-3 text-text-light"
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-muted">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-dark-layer p-3 text-text-light"
              placeholder="Explain your event vision, audience quality, and sponsorship impact..."
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-muted">Event Media Images (3-5) *</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setEventImages(Array.from(e.target.files || []))}
              className="w-full rounded-lg border border-white/10 bg-dark-layer p-3 text-text-light"
            />
            <p className="mt-2 text-xs text-text-muted">Upload past event or venue images to build trust.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-muted">Short Event Video (optional)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setEventVideo(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-white/10 bg-dark-layer p-3 text-text-light"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-muted">What you provide to sponsors (max 5) *</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sponsorValueOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOrganizerProvides(option)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left ${
                    formData.organizerProvides.includes(option)
                      ? 'border-accent-orange bg-accent-orange/20 text-accent-orange'
                      : 'border-white/15 bg-white/5 text-text-light'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" size="lg" fullWidth loading={loading}>
              {loading ? 'Publishing Event...' : 'Publish Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
