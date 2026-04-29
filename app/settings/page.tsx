"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";

type CurrentUser = {
  _id?: string;
  id?: string;
  role?: "ORGANIZER" | "SPONSOR";
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  bio?: string;
  organizationName?: string;
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

type AccountFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  bio: string;
  organizationName: string;
  organizerLocation: string;
};

type SponsorFormState = {
  brandName: string;
  companyName: string;
  website: string;
  officialEmail: string;
  phone: string;
  industry: string;
  companySize: string;
  about: string;
  logoUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  isPublic: boolean;
};

const initialAccountForm: AccountFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  companyName: "",
  bio: "",
  organizationName: "",
  organizerLocation: "",
};

const initialSponsorForm: SponsorFormState = {
  brandName: "",
  companyName: "",
  website: "",
  officialEmail: "",
  phone: "",
  industry: "",
  companySize: "",
  about: "",
  logoUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
  isPublic: true,
};

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "").slice(0, 15);
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(
    null
  );

  const [accountForm, setAccountForm] =
    useState<AccountFormState>(initialAccountForm);
  const [sponsorForm, setSponsorForm] =
    useState<SponsorFormState>(initialSponsorForm);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login?redirect=/settings");
      return;
    }

    if (user.role !== "ORGANIZER" && user.role !== "SPONSOR") {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    let isMounted = true;

    const loadSettings = async () => {
      try {
        setPageLoading(true);
        setPageError("");
        setSaveError("");
        setSaveSuccess("");

        const res = await fetch("/api/settings/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        const data: SettingsMeResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to load settings");
        }

        if (!isMounted) return;

        const loadedUser = data.user || null;
        const loadedSponsorProfile = data.sponsorProfile || null;

        setCurrentUser(loadedUser);
        setSponsorProfile(loadedSponsorProfile);

        setAccountForm({
          firstName: loadedUser?.firstName || "",
          lastName: loadedUser?.lastName || "",
          phone: loadedUser?.phone || "",
          companyName: loadedUser?.companyName || "",
          bio: loadedUser?.bio || "",
          organizationName: loadedUser?.organizationName || "",
          organizerLocation: loadedUser?.organizerLocation || "",
        });

        if ((loadedUser?.role || user?.role) === "SPONSOR") {
          setSponsorForm({
            brandName: loadedSponsorProfile?.brandName || "",
            companyName:
              loadedSponsorProfile?.companyName ||
              loadedUser?.companyName ||
              "",
            website: loadedSponsorProfile?.website || "",
            officialEmail:
              loadedSponsorProfile?.officialEmail || loadedUser?.email || "",
            phone: loadedSponsorProfile?.phone || loadedUser?.phone || "",
            industry: loadedSponsorProfile?.industry || "",
            companySize: loadedSponsorProfile?.companySize || "",
            about: loadedSponsorProfile?.about || loadedUser?.bio || "",
            logoUrl: loadedSponsorProfile?.logoUrl || "",
            instagramUrl: loadedSponsorProfile?.instagramUrl || "",
            linkedinUrl: loadedSponsorProfile?.linkedinUrl || "",
            isPublic:
              typeof loadedSponsorProfile?.isPublic === "boolean"
                ? loadedSponsorProfile.isPublic
                : true,
          });
        } else {
          setSponsorForm(initialSponsorForm);
        }
      } catch (err: any) {
        if (!isMounted || err?.name === "AbortError") return;

        setPageError(err?.message || "Unable to load settings");
        setCurrentUser(null);
        setSponsorProfile(null);
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user]);

  const role = currentUser?.role || user?.role;

  const sponsorCompletion = useMemo(() => {
    if (role !== "SPONSOR") return 0;

    let score = 20;

    if (sponsorForm.brandName.trim()) score += 20;
    if (sponsorForm.companyName.trim()) score += 20;
    if (sponsorForm.officialEmail.trim()) score += 15;
    if (sponsorForm.phone.trim()) score += 15;
    if (sponsorForm.logoUrl.trim()) score += 15;
    if (sponsorForm.about.trim()) score += 15;

    return Math.min(score, 100);
  }, [role, sponsorForm]);

  const isSponsorProfileReady = useMemo(() => {
    return Boolean(sponsorProfile?.isProfileComplete) || sponsorCompletion >= 70;
  }, [sponsorProfile, sponsorCompletion]);

  const handleAccountChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setSaveError("");
    setSaveSuccess("");

    setAccountForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? onlyNumbers(value) : value,
    }));
  };

  const handleSponsorChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setSaveError("");
    setSaveSuccess("");

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setSponsorForm((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    setSponsorForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? onlyNumbers(value) : value,
    }));
  };

  const handleSponsorLogoUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      setSaveError("");
      setSaveSuccess("");

      const formData = new FormData();
      formData.append("uploadType", "sponsorLogo");
      formData.append("files", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.files?.[0]?.url) {
        throw new Error(data.message || "Logo upload failed");
      }

      setSponsorForm((prev) => ({
        ...prev,
        logoUrl: data.files[0].url,
      }));

      setSaveSuccess("Logo uploaded. Click Save Profile to store it.");
    } catch (err: any) {
      setSaveError(err?.message || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleOrganizerSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (role !== "ORGANIZER") {
      setSaveError("Only organizers can update organizer settings.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveSuccess("");

      const payload = {
        role,
        firstName: accountForm.firstName,
        lastName: accountForm.lastName,
        phone: accountForm.phone,
        companyName: accountForm.companyName,
        bio: accountForm.bio,
        organizationName: accountForm.organizationName,
        organizerLocation: accountForm.organizerLocation,
      };

      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save organizer settings");
      }

      setCurrentUser(data.user || currentUser);
      setSaveSuccess("Settings saved successfully.");
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save organizer settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSponsorSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (role !== "SPONSOR") {
      setSaveError("Only sponsors can update sponsor profile settings.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveSuccess("");

      const payload = {
        role,
        firstName: accountForm.firstName,
        lastName: accountForm.lastName,
        phone: sponsorForm.phone,
        companyName: sponsorForm.companyName,
        bio: sponsorForm.about,
        brandName: sponsorForm.brandName,
        website: sponsorForm.website,
        officialEmail: sponsorForm.officialEmail,
        industry: sponsorForm.industry,
        companySize: sponsorForm.companySize,
        about: sponsorForm.about,
        logoUrl: sponsorForm.logoUrl,
        instagramUrl: sponsorForm.instagramUrl,
        linkedinUrl: sponsorForm.linkedinUrl,
        isPublic: sponsorForm.isPublic,
      };

      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save sponsor profile");
      }

      setCurrentUser(data.user || currentUser);
      setSponsorProfile(data.sponsorProfile || null);
      setSaveSuccess("Settings saved successfully.");
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save sponsor profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading settings...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(255,122,24,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,179,71,0.06),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="container-custom max-w-5xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Settings
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Account &amp; Profile Settings
            </h1>

            <p className="mt-3 max-w-3xl text-text-muted">
              Manage permanent identity details used across Sponexus.
            </p>
          </div>

          <Link
            href={
              role === "SPONSOR" ? "/dashboard/sponsor" : "/dashboard/organizer"
            }
          >
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>

        {pageError ? (
          <div className="mb-8 rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {pageError}
          </div>
        ) : null}

<AccountSettingsCard
  email={currentUser?.email || user?.email || ""}
  role={role || ""}
  isEmailVerified={Boolean((user as any)?.isEmailVerified)}
/>


        {role === "SPONSOR" ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <StatCard title="Profile Completion" value={`${sponsorCompletion}%`} />
              <StatCard
                title="Profile Status"
                value={isSponsorProfileReady ? "Ready" : "Needs Work"}
              />
              <StatCard
                title="Visibility"
                value={sponsorForm.isPublic ? "Public" : "Private"}
              />
            </div>

            <form
              onSubmit={handleSponsorSave}
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">Sponsor Identity</h2>
                <p className="mt-2 text-sm text-text-muted">
                  These are permanent company details. Campaign needs, audience,
                  categories, and deliverables are added while creating a sponsorship post.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="First Name"
                  name="firstName"
                  value={accountForm.firstName}
                  onChange={handleAccountChange}
                  required
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={accountForm.lastName}
                  onChange={handleAccountChange}
                  required
                />
                <Input
                  label="Brand Name"
                  name="brandName"
                  value={sponsorForm.brandName}
                  onChange={handleSponsorChange}
                  required
                />
                <Input
                  label="Company Name"
                  name="companyName"
                  value={sponsorForm.companyName}
                  onChange={handleSponsorChange}
                  required
                />
                <Input
                  label="Official Email"
                  type="email"
                  name="officialEmail"
                  value={sponsorForm.officialEmail}
                  onChange={handleSponsorChange}
                  required
                />
                <Input
                  label="Phone"
                  name="phone"
                  value={sponsorForm.phone}
                  onChange={handleSponsorChange}
                  required
                />
               <Input
  label="Website"
  type="url"
  name="website"
  value={sponsorForm.website}
  onChange={handleSponsorChange}
  placeholder="https://yourbusiness.com"
/>
                <Input
                  label="Industry"
                  name="industry"
                  value={sponsorForm.industry}
                  onChange={handleSponsorChange}
                />
                <Input
                  label="Company Size"
                  name="companySize"
                  value={sponsorForm.companySize}
                  onChange={handleSponsorChange}
                />
                <Input
  label="Instagram URL"
  type="url"
  name="instagramUrl"
  value={sponsorForm.instagramUrl}
  onChange={handleSponsorChange}
  placeholder="https://instagram.com/yourbrand"
/>
                <Input
  label="LinkedIn URL"
  type="url"
  name="linkedinUrl"
  value={sponsorForm.linkedinUrl}
  onChange={handleSponsorChange}
  placeholder="https://linkedin.com/company/yourbrand"
/>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-white">
                    Logo / Brand / Business Image
                    <span className="ml-1 text-accent-orange">*</span>
                  </label>

                  <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
                    {sponsorForm.logoUrl ? (
                      <img
                        src={sponsorForm.logoUrl}
                        alt="Sponsor logo"
                        className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-white/20 text-xs text-text-muted">
                        No logo
                      </div>
                    )}

                    <div className="flex-1">
                      <input
                        id="sponsor-logo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleSponsorLogoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="sponsor-logo-upload"
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                       {uploadingLogo ? "Uploading..." : "Upload Logo / Business Image"}
                      </label>
                      <p className="mt-2 text-xs text-text-muted">
                        JPG, PNG, or WEBP. Maximum 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-white">
                    About Brand
                  </label>
                  <textarea
                    name="about"
                    value={sponsorForm.about}
                    onChange={handleSponsorChange}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>

                <div className="md:col-span-2 flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={sponsorForm.isPublic}
                    onChange={handleSponsorChange}
                    className="h-4 w-4"
                  />
                  <label className="ml-3 text-sm font-medium text-white">
                    Make sponsor profile public
                  </label>
                </div>
              </div>

              <SaveMessages error={saveError} success={saveSuccess} />

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>

                <Link href="/sponsorships/create">
                  <Button type="button" variant="secondary">
                    Create Sponsorship
                  </Button>
                </Link>
              </div>
            </form>
          </>
        ) : role === "ORGANIZER" ? (
          <form
            onSubmit={handleOrganizerSave}
            className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">
                Organizer Identity
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                These are permanent organizer details. Event audience, category,
                budget, deliverables, and event focus are added while creating an event.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="First Name"
                name="firstName"
                value={accountForm.firstName}
                onChange={handleAccountChange}
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                value={accountForm.lastName}
                onChange={handleAccountChange}
                required
              />
              <Input
                label="Phone"
                name="phone"
                value={accountForm.phone}
                onChange={handleAccountChange}
                required
              />
              <Input
                label="Company / Club Name"
                name="companyName"
                value={accountForm.companyName}
                onChange={handleAccountChange}
              />
              <Input
                label="Organization Name"
                name="organizationName"
                value={accountForm.organizationName}
                onChange={handleAccountChange}
                required
              />
              <Input
                label="Base Location"
                name="organizerLocation"
                value={accountForm.organizerLocation}
                onChange={handleAccountChange}
                required
              />

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-white">
                  Bio / About
                </label>
                <textarea
                  name="bio"
                  value={accountForm.bio}
                  onChange={handleAccountChange}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                />
              </div>
            </div>

            <SaveMessages error={saveError} success={saveSuccess} />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving..." : "Save Organizer Settings"}
              </Button>

              <Link href="/events/create">
                <Button type="button" variant="secondary">
                  Create Event
                </Button>
              </Link>
            </div>
          </form>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 text-text-muted backdrop-blur-xl">
            Settings not available for this account.
          </div>
        )}
      </div>
    </div>
  );
}

function AccountSettingsCard({
  email,
  role,
  isEmailVerified,
}: {
  email: string;
  role: string;
  isEmailVerified: boolean;
}) {
  return (
    <div className="mb-8 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Account Security</h2>
          <p className="mt-2 text-sm text-text-muted">
            Manage your login email and password.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/change-password">
            <Button type="button" variant="secondary">
              Change Password
            </Button>
          </Link>
          <Link href="/change-email">
            <Button type="button" variant="secondary">
              Change Email
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-dark-layer px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
            Email
          </p>
          <p className="mt-2 break-all text-sm font-semibold text-white">
            {email || "Not available"}
          </p>
          <span className="mt-3 inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-300">
            {isEmailVerified ? "Verified" : "Not verified"}
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-dark-layer px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
            Account Role
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {role || "User"}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Role changes require support approval.
          </p>
        </div>
      </div>
    </div>
  );
}
function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
      <p className="text-sm text-text-muted">{title}</p>
      <h3 className="mt-2 text-xl font-semibold text-white">{value}</h3>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  required,
  type = "text",
  placeholder = "",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white">
        {label}
        {required ? <span className="ml-1 text-accent-orange">*</span> : null}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
      />
    </div>
  );
}

function SaveMessages({
  error,
  success,
}: {
  error: string;
  success: string;
}) {
  return (
    <>
      {error ? (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
          {success}
        </div>
      ) : null}
    </>
  );
}
