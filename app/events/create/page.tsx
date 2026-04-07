'use client';

import { useEffect, useState } from 'react';
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

export default function CreateEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleArray = (field: 'categories' | 'targetAudience', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.description || !formData.location || !formData.budget) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizerId: user._id,
          budget: parseInt(formData.budget),
          attendeeCount: parseInt(formData.attendeeCount) || 100,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create event');
      }

      const data = await response.json();
      router.push(`/events/${data.event._id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="section">
      <div className="container-custom max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Event</h1>
          <p className="text-text-muted">
            Fill in the details about your event. Be as specific as possible for better sponsor matches.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-light">Basic Information</h3>
            <Input
              label="Event Title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Tech Summit 2026"
            />

            <div>
              <label className="block text-sm font-medium text-text-light mb-2">Description</label>
              <Input
                as="textarea"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Tell us about your event..."
                className="resize-none h-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Event Type"
                name="eventType"
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                as="select"
                required
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Input>

              <Input
                label="Location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="New York, NY"
              />
            </div>
          </div>

          {/* Financial & Attendance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-light">Financial & Attendance</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Budget ($)"
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                required
                placeholder="50000"
              />

              <Input
                label="Expected Attendees"
                type="number"
                name="attendeeCount"
                value={formData.attendeeCount}
                onChange={handleChange}
                placeholder="500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />

              <Input
                label="End Date"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-light">Categories (Select all that apply)</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(cat)}
                    onChange={() => toggleArray('categories', cat)}
                    className="w-4 h-4 rounded accent-accent-orange"
                  />
                  <span className="text-text-light">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-light">Target Audience</h3>
            <div className="grid grid-cols-2 gap-3">
              {audiences.map((aud) => (
                <label key={aud} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.targetAudience.includes(aud)}
                    onChange={() => toggleArray('targetAudience', aud)}
                    className="w-4 h-4 rounded accent-accent-orange"
                  />
                  <span className="text-text-light">{aud}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Image URL */}
          <Input
            label="Event Image URL (Optional)"
            type="url"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />

          {/* Submit */}
          <div className="flex gap-4 pt-6">
            <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
