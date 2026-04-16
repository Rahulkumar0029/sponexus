"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

type UserRole = "ORGANIZER" | "SPONSOR";

type CurrentUser = {
  _id?: string;
  id?: string;
  role?: UserRole;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  companyName?: string;
  organizationName?: string;
  eventFocus?: string;
  organizerTargetAudience?: string;
  organizerLocation?: string;
};

type SponsorProfile = {
  _id?: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  website?: string;
  officialEmail?: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  about?: string;
  logoUrl?: string;
  targetAudience?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  sponsorshipInterests?: string[];
  instagramUrl?: string;
  linkedinUrl?: string;
  isProfileComplete?: boolean;
  isPublic?: boolean;
};

type SettingsMeResponse = {
  success: boolean;
  user?: CurrentUser;
  sponsorProfile?: SponsorProfile | null;
  message?: string;
};

type OrganizerFormState = {
  role: "ORGANIZER";
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  companyName: string;
  organizationName: string;
  eventFocus: string;
  organizerTargetAudience: string;
  organizerLocation: string;
};

type SponsorFormState = {
  role: "SPONSOR";
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  companyName: string;
  brandName: string;
  website: string;
  officialEmail: string;
  industry: string;
  companySize: string;
  about: string;
  logoUrl: string;
  targetAudience: string;
  preferredCategories: string;
  preferredLocations: string;
  sponsorshipInterests: string;
  instagramUrl: string;
  linkedinUrl: string;
  isPublic: boolean;
};

function arrayToText(value?: string[]) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function textToArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidEmail(value: string) {
  if (!value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  if (!value.trim()) return false;
  return /^[0-9+\-\s()]{7,20}$/.test(value.trim());
}

function isValidUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);

  const [organizerForm, setOrganizerForm] = useState<OrganizerFormState>({
    role: "ORGANIZER",
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    companyName: "",
    organizationName: "",
    eventFocus: "",
    organizerTargetAudience: "",
    organizerLocation: "",
  });

  const [sponsorForm, setSponsorForm] = useState<SponsorFormState>({
    role: "SPONSOR",
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    companyName: "",
    brandName: "",
    website: "",
    officialEmail: "",
    industry: "",
    companySize: "",
    about: "",
    logoUrl: "",
    targetAudience: "",
    preferredCategories: "",
    preferredLocations: "",
    sponsorshipInterests: "",
    instagramUrl: "",
    linkedinUrl: "",
    isPublic: true,
  });

  const role = user?.role;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setBootLoading(true);
        setPageError("");

        const res = await fetch("/api/settings/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: SettingsMeResponse = await res.json();

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        if (!res.ok || !data.success || !data.user) {
          throw new Error(data.message || "Failed to load settings");
        }

        setUser(data.user);
        setSponsorProfile(data.sponsorProfile || null);

        if (data.user.role === "ORGANIZER") {
          setOrganizerForm({
            role: "ORGANIZER",
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            phone: data.user.phone || "",
            bio: data.user.bio || "",
            companyName: data.user.companyName || "",
            organizationName: data.user.organizationName || "",
            eventFocus: data.user.eventFocus || "",
            organizerTargetAudience: data.user.organizerTargetAudience || "",
            organizerLocation: data.user.organizerLocation || "",
          });
        }

        if (data.user.role === "SPONSOR") {
          setSponsorForm({
            role: "SPONSOR",
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            phone: data.sponsorProfile?.phone || data.user.phone || "",
            bio: data.user.bio || "",
            companyName: data.sponsorProfile?.companyName || data.user.companyName || "",
            brandName: data.sponsorProfile?.brandName || "",
            website: data.sponsorProfile?.website || "",
            officialEmail: data.sponsorProfile?.officialEmail || data.user.email || "",
            industry: data.sponsorProfile?.industry || "",
            companySize: data.sponsorProfile?.companySize || "",
            about: data.sponsorProfile?.about || "",
            logoUrl: data.sponsorProfile?.logoUrl || "",
            targetAudience: data.sponsorProfile?.targetAudience || "",
            preferredCategories: arrayToText(data.sponsorProfile?.preferredCategories),
            preferredLocations: arrayToText(data.sponsorProfile?.preferredLocations),
            sponsorshipInterests: arrayToText(data.sponsorProfile?.sponsorshipInterests),
            instagramUrl: data.sponsorProfile?.instagramUrl || "",
            linkedinUrl: data.sponsorProfile?.linkedinUrl || "",
            isPublic:
              typeof data.sponsorProfile?.isPublic === "boolean"
                ? data.sponsorProfile.isPublic
                : true,
          });
        }
      } catch (err: any) {
        setPageError(err?.message || "Failed to load settings");
      } finally {
        setBootLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  const sponsorCompletion = useMemo(() => {
    if (role !== "SPONSOR") return 0;

    let score = 0;
    if (sponsorForm.brandName.trim()) score += 15;
    if (sponsorForm.companyName.trim()) score += 10;
    if (sponsorForm.officialEmail.trim()) score += 10;
    if (sponsorForm.phone.trim()) score += 10;
    if (sponsorForm.industry.trim()) score += 15;
    if (sponsorForm.targetAudience.trim()) score += 10;
    if (textToArray(sponsorForm.preferredCategories).length > 0) score += 10;
    if (textToArray(sponsorForm.preferredLocations).length > 0) score += 10;
    if (sponsorForm.website.trim()) score += 5;
    if (sponsorForm.about.trim()) score += 5;

    return Math.min(score, 100);
  }, [role, sponsorForm]);

  const handleOrganizerChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setOrganizerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSponsorChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSponsorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSponsorCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSponsorForm((prev) => ({ ...prev, [name]: checked }));
  };

  const validateOrganizerForm = () => {
    if (!organizerForm.firstName.trim()) return "First name is required";
    if (!organizerForm.lastName.trim()) return "Last name is required";
    if (!organizerForm.companyName.trim()) return "Company name is required";
    if (organizerForm.phone.trim() && !isValidPhone(organizerForm.phone)) {
      return "Enter a valid phone number";
    }
    return "";
  };

  const validateSponsorForm = () => {
    if (!sponsorForm.firstName.trim()) return "First name is required";
    if (!sponsorForm.lastName.trim()) return "Last name is required";
    if (!sponsorForm.companyName.trim()) return "Company name is required";
    if (!sponsorForm.brandName.trim()) return "Brand name is required";
    if (!sponsorForm.officialEmail.trim()) return "Official email is required";
    if (!isValidEmail(sponsorForm.officialEmail)) return "Enter a valid official email";
    if (!sponsorForm.phone.trim()) return "Phone number is required";
    if (!isValidPhone(sponsorForm.phone)) return "Enter a valid phone number";
    if (!sponsorForm.industry.trim()) return "Industry is required";
    if (!isValidUrl(sponsorForm.website)) return "Enter a valid website URL";
    if (!isValidUrl(sponsorForm.logoUrl)) return "Enter a valid logo URL";
    if (!isValidUrl(sponsorForm.instagramUrl)) return "Enter a valid Instagram URL";
    if (!isValidUrl(sponsorForm.linkedinUrl)) return "Enter a valid LinkedIn URL";
    return "";
  };

  const saveOrganizerSettings = async () => {
    const payload = {
      role: "ORGANIZER",
      firstName: organizerForm.firstName.trim(),
      lastName: organizerForm.lastName.trim(),
      phone: organizerForm.phone.trim(),
      bio: organizerForm.bio.trim(),
      companyName: organizerForm.companyName.trim(),
      organizationName: organizerForm.organizationName.trim(),
      eventFocus: organizerForm.eventFocus.trim(),
      organizerTargetAudience: organizerForm.organizerTargetAudience.trim(),
      organizerLocation: organizerForm.organizerLocation.trim(),
    };

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    return res.json();
  };

  const saveSponsorSettings = async () => {
    const payload = {
      role: "SPONSOR",
      firstName: sponsorForm.firstName.trim(),
      lastName: sponsorForm.lastName.trim(),
      phone: sponsorForm.phone.trim(),
      bio: sponsorForm.bio.trim(),
      companyName: sponsorForm.companyName.trim(),
      brandName: sponsorForm.brandName.trim(),
      website: sponsorForm.website.trim(),
      officialEmail: sponsorForm.officialEmail.trim(),
      industry: sponsorForm.industry.trim(),
      companySize: sponsorForm.companySize.trim(),
      about: sponsorForm.about.trim(),
      logoUrl: sponsorForm.logoUrl.trim(),
      targetAudience: sponsorForm.targetAudience.trim(),
      preferredCategories: textToArray(sponsorForm.preferredCategories),
      preferredLocations: textToArray(sponsorForm.preferredLocations),
      sponsorshipInterests: textToArray(sponsorForm.sponsorshipInterests),
      instagramUrl: sponsorForm.instagramUrl.trim(),
      linkedinUrl: sponsorForm.linkedinUrl.trim(),
      isPublic: sponsorForm.isPublic,
    };

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    return res.json();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setPageError("");
      setSuccessMessage("");

      const validationMessage =
        role === "ORGANIZER" ? validateOrganizerForm() : validateSponsorForm();

      if (validationMessage) {
        throw new Error(validationMessage);
      }

      let data: any;

      if (role === "ORGANIZER") {
        data = await saveOrganizerSettings();
      } else if (role === "SPONSOR") {
        data = await saveSponsorSettings();
      } else {
        throw new Error("Unsupported user role");
      }

      if (!data?.success) {
        throw new Error(data?.message || "Failed to save settings");
      }

      setSuccessMessage("Settings saved successfully");
    } catch (err: any) {
      setPageError(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading settings...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            title="Log in to manage settings"
            description="Your settings are available after signing in."
            actionLabel="Log In"
            onAction={() => router.push("/login")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Account Settings
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              {role === "SPONSOR" ? "Sponsor Settings" : "Organizer Settings"}
            </h1>

            <p className="mt-3 max-w-2xl text-text-muted">
              {role === "SPONSOR"
                ? "Manage your fixed sponsor profile. This profile powers matching and sponsorship visibility."
                : "Manage your organizer identity and event-facing profile information."}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href={role === "SPONSOR" ? "/dashboard/sponsor" : "/dashboard/organizer"}>
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {pageError && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {pageError}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            {successMessage}
          </div>
        )}

        {role === "SPONSOR" && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.05] p-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Profile Completion</h2>
                <p className="text-sm text-text-muted">
                  Complete the important fields to unlock strong event matching.
                </p>
              </div>
              <div className="text-2xl font-bold text-accent-orange">{sponsorCompletion}%</div>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent-orange transition-all duration-300"
                style={{ width: `${sponsorCompletion}%` }}
              />
            </div>
          </div>
        )}

        {role === "ORGANIZER" ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h2 className="mb-5 text-xl font-semibold text-white">Basic Information</h2>

              <div className="space-y-4">
                <Field label="First Name" name="firstName" type="text" value={organizerForm.firstName} onChange={handleOrganizerChange} />
                <Field label="Last Name" name="lastName" type="text" value={organizerForm.lastName} onChange={handleOrganizerChange} />
                <Field label="Phone" name="phone" type="tel" value={organizerForm.phone} onChange={handleOrganizerChange} />
                <Field label="Company Name" name="companyName" type="text" value={organizerForm.companyName} onChange={handleOrganizerChange} />
                <TextAreaField label="Bio" name="bio" value={organizerForm.bio} onChange={handleOrganizerChange} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h2 className="mb-5 text-xl font-semibold text-white">Organizer Profile</h2>

              <div className="space-y-4">
                <Field label="Organization Name" name="organizationName" type="text" value={organizerForm.organizationName} onChange={handleOrganizerChange} />
                <Field label="Event Focus" name="eventFocus" type="text" value={organizerForm.eventFocus} onChange={handleOrganizerChange} />
                <Field label="Target Audience" name="organizerTargetAudience" type="text" value={organizerForm.organizerTargetAudience} onChange={handleOrganizerChange} />
                <Field label="Primary Location" name="organizerLocation" type="text" value={organizerForm.organizerLocation} onChange={handleOrganizerChange} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h2 className="mb-5 text-xl font-semibold text-white">Basic Information</h2>

              <div className="space-y-4">
                <Field label="First Name" name="firstName" type="text" value={sponsorForm.firstName} onChange={handleSponsorChange} />
                <Field label="Last Name" name="lastName" type="text" value={sponsorForm.lastName} onChange={handleSponsorChange} />
                <Field label="Phone" name="phone" type="tel" value={sponsorForm.phone} onChange={handleSponsorChange} />
                <Field label="Company Name" name="companyName" type="text" value={sponsorForm.companyName} onChange={handleSponsorChange} />
                <TextAreaField label="Bio" name="bio" value={sponsorForm.bio} onChange={handleSponsorChange} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h2 className="mb-5 text-xl font-semibold text-white">Sponsor Profile</h2>

              <div className="space-y-4">
                <Field label="Brand Name" name="brandName" type="text" value={sponsorForm.brandName} onChange={handleSponsorChange} />
                <Field label="Official Email" name="officialEmail" type="email" value={sponsorForm.officialEmail} onChange={handleSponsorChange} />
                <Field label="Website" name="website" type="url" value={sponsorForm.website} onChange={handleSponsorChange} placeholder="https://example.com" />
                <Field label="Industry" name="industry" type="text" value={sponsorForm.industry} onChange={handleSponsorChange} />
                <Field label="Company Size" name="companySize" type="text" value={sponsorForm.companySize} onChange={handleSponsorChange} />
                <Field label="Logo URL" name="logoUrl" type="url" value={sponsorForm.logoUrl} onChange={handleSponsorChange} placeholder="https://example.com/logo.png" />
                <Field label="Target Audience" name="targetAudience" type="text" value={sponsorForm.targetAudience} onChange={handleSponsorChange} />
                <Field
                  label="Preferred Categories"
                  name="preferredCategories"
                  type="text"
                  value={sponsorForm.preferredCategories}
                  onChange={handleSponsorChange}
                  helper="Separate multiple values with commas"
                />
                <Field
                  label="Preferred Locations"
                  name="preferredLocations"
                  type="text"
                  value={sponsorForm.preferredLocations}
                  onChange={handleSponsorChange}
                  helper="Separate multiple values with commas"
                />
                <Field
                  label="Sponsorship Interests"
                  name="sponsorshipInterests"
                  type="text"
                  value={sponsorForm.sponsorshipInterests}
                  onChange={handleSponsorChange}
                  helper="Separate multiple values with commas"
                />
                <Field label="Instagram URL" name="instagramUrl" type="url" value={sponsorForm.instagramUrl} onChange={handleSponsorChange} placeholder="https://instagram.com/yourbrand" />
                <Field label="LinkedIn URL" name="linkedinUrl" type="url" value={sponsorForm.linkedinUrl} onChange={handleSponsorChange} placeholder="https://linkedin.com/company/yourbrand" />
                <TextAreaField label="About Brand" name="about" value={sponsorForm.about} onChange={handleSponsorChange} />

                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={sponsorForm.isPublic}
                    onChange={handleSponsorCheckbox}
                  />
                  <span>Make sponsor profile public</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  helper?: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
};

function Field({
  label,
  name,
  value,
  onChange,
  helper,
  type = "text",
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-light">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent-orange"
      />
      {helper && <p className="mt-2 text-xs text-text-muted">{helper}</p>}
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

function TextAreaField({ label, name, value, onChange }: TextAreaFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-light">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={5}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent-orange"
      />
    </div>
  );
}