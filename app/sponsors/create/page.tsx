'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

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

const sponsorshipTypes = [
  'Cash Sponsorship',
  'In-Kind Sponsorship',
  'Media Partnership',
  'Title Sponsorship',
  'Co-Sponsor',
  'Product Sampling',
];

type SponsorUser = {
  _id?: string;
  role?: string;
  brandName?: string;
  description?: string;
  preferredCategories?: string[];
  sponsorTargetAudience?: string;
  targetAudience?: string;
  locationPreference?: string;
  website?: string;
  officialEmail?: string;
  officialPhone?: string;
};

type SponsorshipFormData = {
  sponsorshipTitle: string;
  sponsorshipType: string;
  budget: string;
  category: string;
  targetAudience: string;
  city: string;
  locationPreference: string;
  campaignGoal: string;
  deliverablesExpected: string;
  customMessage: string;
  bannerRequirement: boolean;
  stallRequirement: boolean;
  mikeAnnouncement: boolean;
  socialMediaMention: boolean;
  productDisplay: boolean;
  contactPersonName: string;
  contactPhone: string;
};

const initialFormData: SponsorshipFormData = {
  sponsorshipTitle: '',
  sponsorshipType: '',
  budget: '',
  category: '',
  targetAudience: '',
  city: '',
  locationPreference: '',
  campaignGoal: '',
  deliverablesExpected: '',
  customMessage: '',
  bannerRequirement: false,
  stallRequirement: false,
  mikeAnnouncement: false,
  socialMediaMention: false,
  productDisplay: false,
  contactPersonName: '',
  contactPhone: '',
};

function isValidIndianPhone(value: string) {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''));
}

export default function CreateSponsorshipPage() {
  const router = useRouter();

  const [user, setUser] = useState<SponsorUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState<SponsorshipFormData>(initialFormData);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser) as SponsorUser;

      if (parsed.role !== 'SPONSOR') {
        router.push('/dashboard');
        return;
      }

      const profileComplete = Boolean(
        parsed.brandName &&
          Array.isArray(parsed.preferredCategories) &&
          parsed.preferredCategories.length > 0 &&
          parsed.officialPhone
      );

      if (!profileComplete) {
        router.push('/settings');
        return;
      }

      setUser(parsed);

      setFormData((prev) => ({
        ...prev,
        category: parsed.preferredCategories?.[0] || '',
        targetAudience: parsed.sponsorTargetAudience || parsed.targetAudience || '',
        locationPreference: parsed.locationPreference || '',
        contactPhone: parsed.officialPhone || '',
      }));
    } catch {
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const updateField = <K extends keyof SponsorshipFormData>(
    field: K,
    value: SponsorshipFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleChange =
    (field: keyof SponsorshipFormData) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      updateField(field as any, e.target.value as any);
    };

  const handleCheckbox =
    (field: keyof SponsorshipFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateField(field as any, e.target.checked as any);
    };

  const validateForm = () => {
    if (!formData.sponsorshipTitle.trim()) return 'Sponsorship title is required';
    if (!formData.sponsorshipType.trim()) return 'Sponsorship type is required';
    if (!formData.budget.trim()) return 'Budget is required';
    if (!formData.category.trim()) return 'Category is required';
    if (!formData.targetAudience.trim()) return 'Target audience is required';
    if (!formData.locationPreference.trim()) return 'Location preference is required';
    if (!formData.campaignGoal.trim()) return 'Campaign goal is required';
    if (!formData.contactPhone.trim()) return 'Contact phone is required';
    if (!isValidIndianPhone(formData.contactPhone)) {
      return 'Enter a valid 10-digit Indian phone number';
    }
    return null;
  };

  const selectedRequirements = useMemo(() => {
    const reqs: string[] = [];
    if (formData.bannerRequirement) reqs.push('Banner placement');
    if (formData.stallRequirement) reqs.push('Stall / booth space');
    if (formData.mikeAnnouncement) reqs.push('Mike announcement');
    if (formData.socialMediaMention) reqs.push('Social media mention');
    if (formData.productDisplay) reqs.push('Product display');
    return reqs;
  }, [formData]);

  const handlePreview = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        sponsorOwnerId: user?._id,
        sponsorProfile: {
          brandName: user?.brandName || '',
          description: user?.description || '',
          website: user?.website || '',
          officialEmail: user?.officialEmail || '',
          officialPhone: user?.officialPhone || '',
          preferredCategories: user?.preferredCategories || [],
          locationPreference: user?.locationPreference || '',
        },
        sponsorship: {
          ...formData,
          requirements: selectedRequirements,
        },
      };

      // Temporary local save until sponsorship API/model is built
      const existing = localStorage.getItem('draft_sponsorships');
      const parsed = existing ? JSON.parse(existing) : [];

      parsed.unshift({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...payload,
      });

      localStorage.setItem('draft_sponsorships', JSON.stringify(parsed));

      setSuccessMessage('Sponsorship draft created successfully.');
      setTimeout(() => {
        router.push('/dashboard/sponsor');
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to create sponsorship post');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-10 text-white">Loading...</div>;
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-16 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white md:text-4xl">
              🚀 Sponsor Now
            </h1>
            <p className="mt-2 text-white/60">
              Create your sponsorship post using your saved profile details and add only campaign-specific requirements here.
            </p>
          </div>

          <Link href="/dashboard/sponsor">
            <Button type="button" variant="secondary">
              Back
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-emerald-300">
            {successMessage}
          </div>
        )}

        {/* Saved Profile Preview */}
        <div className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Saved Sponsor Profile</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-text-muted">Brand</p>
              <p className="mt-1 font-semibold text-white">{user.brandName || 'Not added'}</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-text-muted">Website</p>
              <p className="mt-1 break-words font-semibold text-white">
                {user.website || 'Not added'}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-text-muted">Official Phone</p>
              <p className="mt-1 font-semibold text-white">
                {user.officialPhone || 'Not added'}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 md:col-span-2 xl:col-span-3">
              <p className="text-sm text-text-muted">Preferred Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.isArray(user.preferredCategories) && user.preferredCategories.length > 0 ? (
                  user.preferredCategories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-light"
                    >
                      {category}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-text-muted">No categories added</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {!showPreview ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl md:p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePreview();
              }}
              className="space-y-8"
            >
              <div>
                <h2 className="mb-4 text-xl font-semibold text-white">Campaign Details</h2>

                <div className="space-y-6">
                  <Input
                    label="Sponsorship Title"
                    value={formData.sponsorshipTitle}
                    onChange={handleChange('sponsorshipTitle')}
                    required
                    placeholder="Campus Tech Fest Partnership"
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Sponsorship Type
                      </label>
                      <select
                        value={formData.sponsorshipType}
                        onChange={handleChange('sponsorshipType')}
                        className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none"
                      >
                        <option value="" className="bg-slate-900">
                          Select type
                        </option>
                        {sponsorshipTypes.map((type) => (
                          <option key={type} value={type} className="bg-slate-900">
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Budget"
                      value={formData.budget}
                      onChange={handleChange('budget')}
                      required
                      placeholder="₹50,000"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={handleChange('category')}
                        className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none"
                      >
                        <option value="" className="bg-slate-900">
                          Select category
                        </option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat} className="bg-slate-900">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Target Audience"
                      value={formData.targetAudience}
                      onChange={handleChange('targetAudience')}
                      required
                      placeholder="Students, founders, creators"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Input
                      label="Location Preference"
                      value={formData.locationPreference}
                      onChange={handleChange('locationPreference')}
                      required
                      placeholder="Delhi NCR / Pan India"
                    />
                    <Input
                      label="City"
                      value={formData.city}
                      onChange={handleChange('city')}
                      placeholder="Optional"
                    />
                  </div>

                  <Input
                    label="Campaign Goal"
                    value={formData.campaignGoal}
                    onChange={handleChange('campaignGoal')}
                    required
                    placeholder="Brand awareness, student outreach, product demo"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Deliverables Expected
                    </label>
                    <textarea
                      value={formData.deliverablesExpected}
                      onChange={handleChange('deliverablesExpected')}
                      rows={4}
                      placeholder="Tell organizers what you expect in return for sponsorship"
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none placeholder:text-white/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Custom Message
                    </label>
                    <textarea
                      value={formData.customMessage}
                      onChange={handleChange('customMessage')}
                      rows={4}
                      placeholder="Add a note for organizers"
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none placeholder:text-white/40"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-8">
                <h2 className="mb-4 text-xl font-semibold text-white">
                  What You Need From the Event
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ['bannerRequirement', 'Banner placement'],
                    ['stallRequirement', 'Stall / booth space'],
                    ['mikeAnnouncement', 'Mike announcement'],
                    ['socialMediaMention', 'Social media mention'],
                    ['productDisplay', 'Product display'],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(formData[key as keyof SponsorshipFormData])}
                        onChange={handleCheckbox(key as keyof SponsorshipFormData)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-8">
                <h2 className="mb-4 text-xl font-semibold text-white">Contact For This Post</h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="Contact Person Name"
                    value={formData.contactPersonName}
                    onChange={handleChange('contactPersonName')}
                    placeholder="Optional"
                  />

                  <Input
                    label="Contact Phone"
                    value={formData.contactPhone}
                    onChange={handleChange('contactPhone')}
                    required
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
                <Link href="/dashboard/sponsor" className="sm:w-auto">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>

                <Button type="submit">Preview Sponsorship</Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl md:p-8">
            <h2 className="mb-6 text-2xl font-semibold text-white">Preview</h2>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Brand</p>
                  <p className="mt-1 font-semibold text-white">{user.brandName}</p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Sponsorship Title</p>
                  <p className="mt-1 font-semibold text-white">{formData.sponsorshipTitle}</p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Type</p>
                  <p className="mt-1 font-semibold text-white">{formData.sponsorshipType}</p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Budget</p>
                  <p className="mt-1 font-semibold text-accent-orange">{formData.budget}</p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Category</p>
                  <p className="mt-1 font-semibold text-white">{formData.category}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Target Audience</p>
                  <p className="mt-1 font-semibold text-white">{formData.targetAudience}</p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Location</p>
                  <p className="mt-1 font-semibold text-white">
                    {formData.locationPreference}
                    {formData.city ? ` • ${formData.city}` : ''}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Campaign Goal</p>
                  <p className="mt-1 font-semibold text-white">{formData.campaignGoal}</p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Requirements</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRequirements.length > 0 ? (
                      selectedRequirements.map((req) => (
                        <span
                          key={req}
                          className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-light"
                        >
                          {req}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-text-muted">No special requirements</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {formData.deliverablesExpected && (
              <div className="mt-6 rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Deliverables Expected</p>
                <p className="mt-2 text-white">{formData.deliverablesExpected}</p>
              </div>
            )}

            {formData.customMessage && (
              <div className="mt-6 rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Custom Message</p>
                <p className="mt-2 text-white">{formData.customMessage}</p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => setShowPreview(false)}>
                Edit Details
              </Button>

              <Button type="button" onClick={handleSubmit} loading={loading}>
                {loading ? 'Posting...' : 'Post Sponsorship'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}