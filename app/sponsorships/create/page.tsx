"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MIN_AUDIENCE = 50;
const MIN_BUDGET = 2000;

export default function CreateSponsorshipPage() {
  const router = useRouter();

  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }, []);

  const [formData, setFormData] = useState({
    sponsorshipTitle: "",
    sponsorshipType: "",
    budget: String(MIN_BUDGET),
    category: "",
    targetAudience: String(MIN_AUDIENCE),
    city: "",
    locationPreference: "",
    campaignGoal: "",
    deliverablesExpected: "",
    customMessage: "",
    bannerRequirement: false,
    stallRequirement: false,
    mikeAnnouncement: false,
    socialMediaMention: false,
    productDisplay: false,
    contactPersonName: "",
    contactPhone: "",
    applicationDeadline: tomorrow,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "targetAudience") {
      if (value === "") {
        setFormData((prev) => ({ ...prev, targetAudience: "" }));
        return;
      }
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue)) {
        setFormData((prev) => ({
          ...prev,
          targetAudience: String(Math.max(MIN_AUDIENCE, numericValue)),
        }));
      }
      return;
    }

    if (name === "budget") {
      if (value === "") {
        setFormData((prev) => ({ ...prev, budget: "" }));
        return;
      }
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue)) {
        setFormData((prev) => ({
          ...prev,
          budget: String(Math.max(MIN_BUDGET, numericValue)),
        }));
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const increaseAudience = () => {
    const current = Number(formData.targetAudience || MIN_AUDIENCE);
    setFormData((prev) => ({
      ...prev,
      targetAudience: String(current + 50),
    }));
  };

  const decreaseAudience = () => {
    const current = Number(formData.targetAudience || MIN_AUDIENCE);
    setFormData((prev) => ({
      ...prev,
      targetAudience: String(Math.max(MIN_AUDIENCE, current - 50)),
    }));
  };

  const increaseBudget = () => {
    const current = Number(formData.budget || MIN_BUDGET);
    setFormData((prev) => ({
      ...prev,
      budget: String(current + 500),
    }));
  };

  const decreaseBudget = () => {
    const current = Number(formData.budget || MIN_BUDGET);
    setFormData((prev) => ({
      ...prev,
      budget: String(Math.max(MIN_BUDGET, current - 500)),
    }));
  };

  const validateForm = () => {
    if (!formData.sponsorshipTitle.trim()) return "Sponsorship title is required";
    if (!formData.sponsorshipType.trim()) return "Sponsorship type is required";
    if (!formData.category.trim()) return "Category is required";
    if (!formData.locationPreference.trim()) return "Location preference is required";
    if (!formData.campaignGoal.trim()) return "Campaign goal is required";
    if (!formData.contactPhone.trim()) return "Contact phone is required";

    const audience = Number(formData.targetAudience);
    if (Number.isNaN(audience) || audience < MIN_AUDIENCE) {
      return `Minimum audience must be at least ${MIN_AUDIENCE}`;
    }

    const budget = Number(formData.budget);
    if (Number.isNaN(budget) || budget < MIN_BUDGET) {
      return `Minimum budget must be at least ₹${MIN_BUDGET}`;
    }

    if (!formData.applicationDeadline) {
      return "Application deadline is required";
    }

    const selectedDate = new Date(formData.applicationDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      return "Application deadline must be after today";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        targetAudience: String(Number(formData.targetAudience)),
        budget: Number(formData.budget),
      };

      const res = await fetch("/api/sponsorships/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create sponsorship");
      }

      setSuccess("Sponsorship created successfully");

      setTimeout(() => {
        router.push("/sponsorships");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Sponsorship</h1>
          <p className="mt-2 text-sm text-gray-400">
            Create a sponsorship opportunity for organizers on Sponexus.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-gray-800 bg-neutral-950 p-6"
        >
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Sponsorship Title
            </label>
            <input
              name="sponsorshipTitle"
              value={formData.sponsorshipTitle}
              onChange={handleTextChange}
              required
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Sponsorship Type
            </label>
            <input
              name="sponsorshipType"
              value={formData.sponsorshipType}
              onChange={handleTextChange}
              required
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Category</label>
            <input
              name="category"
              value={formData.category}
              onChange={handleTextChange}
              required
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Target Audience
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decreaseAudience}
                className="rounded-xl border border-gray-700 px-4 py-3 text-white"
              >
                -
              </button>

              <input
                name="targetAudience"
                type="number"
                min={MIN_AUDIENCE}
                step={1}
                inputMode="numeric"
                value={formData.targetAudience}
                onChange={handleTextChange}
                className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
              />

              <button
                type="button"
                onClick={increaseAudience}
                className="rounded-xl border border-gray-700 px-4 py-3 text-white"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Minimum audience is {MIN_AUDIENCE}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Budget (₹)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decreaseBudget}
                className="rounded-xl border border-gray-700 px-4 py-3 text-white"
              >
                -
              </button>

              <input
                name="budget"
                type="number"
                min={MIN_BUDGET}
                step={1}
                inputMode="numeric"
                value={formData.budget}
                onChange={handleTextChange}
                className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
              />

              <button
                type="button"
                onClick={increaseBudget}
                className="rounded-xl border border-gray-700 px-4 py-3 text-white"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Minimum budget is ₹{MIN_BUDGET}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">City</label>
            <input
              name="city"
              value={formData.city}
              onChange={handleTextChange}
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Location Preference
            </label>
            <input
              name="locationPreference"
              value={formData.locationPreference}
              onChange={handleTextChange}
              required
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Campaign Goal
            </label>
            <textarea
              name="campaignGoal"
              value={formData.campaignGoal}
              onChange={handleTextChange}
              rows={4}
              required
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Deliverables Expected
            </label>
            <textarea
              name="deliverablesExpected"
              value={formData.deliverablesExpected}
              onChange={handleTextChange}
              rows={3}
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Custom Message
            </label>
            <textarea
              name="customMessage"
              value={formData.customMessage}
              onChange={handleTextChange}
              rows={3}
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-gray-800 p-4">
              <input
                type="checkbox"
                name="bannerRequirement"
                checked={formData.bannerRequirement}
                onChange={handleCheckboxChange}
              />
              <span>Banner Requirement</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-gray-800 p-4">
              <input
                type="checkbox"
                name="stallRequirement"
                checked={formData.stallRequirement}
                onChange={handleCheckboxChange}
              />
              <span>Stall Requirement</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-gray-800 p-4">
              <input
                type="checkbox"
                name="mikeAnnouncement"
                checked={formData.mikeAnnouncement}
                onChange={handleCheckboxChange}
              />
              <span>Mike Announcement</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-gray-800 p-4">
              <input
                type="checkbox"
                name="socialMediaMention"
                checked={formData.socialMediaMention}
                onChange={handleCheckboxChange}
              />
              <span>Social Media Mention</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-gray-800 p-4 sm:col-span-2">
              <input
                type="checkbox"
                name="productDisplay"
                checked={formData.productDisplay}
                onChange={handleCheckboxChange}
              />
              <span>Product Display</span>
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Contact Person Name
            </label>
            <input
              name="contactPersonName"
              value={formData.contactPersonName}
              onChange={handleTextChange}
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Contact Phone
            </label>
            <input
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleTextChange}
              required
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Application Deadline
            </label>
            <input
              name="applicationDeadline"
              type="date"
              min={tomorrow}
              value={formData.applicationDeadline}
              onChange={handleTextChange}
              required
              className="w-full rounded-xl border border-gray-800 bg-black px-4 py-3 outline-none focus:border-white"
            />
            <p className="mt-2 text-xs text-gray-500">
              Deadline must be after today
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Sponsorship"}
          </button>
        </form>
      </div>
    </main>
  );
}