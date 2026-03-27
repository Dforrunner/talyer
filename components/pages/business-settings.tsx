"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { Upload } from "lucide-react";
import { db } from "@/lib/db";
import { safeFileSave, getElectronAPI } from "@/lib/electron-api";
import { useLanguage, type Language } from "@/hooks/use-language";
import { normalizePhilippinePhone } from "@/lib/phone-utils";

interface BusinessSettings {
  id: number;
  business_name: string;
  logo_path: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  tax_id: string;
  currency: string;
  vat_rate: number;
  language?: string;
}

interface PendingLogoUpload {
  dataUrl: string;
  fileName: string;
}

const BusinessSettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { showAlert } = useAppDialog();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [pendingLogoUpload, setPendingLogoUpload] =
    useState<PendingLogoUpload | null>(null);

  useEffect(() => {
    setSettings((prev) => (prev ? { ...prev, language } : prev));
  }, [language]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await db.get("SELECT * FROM business_settings LIMIT 1");
      if (result) {
        setSettings({
          ...result,
          business_name: result.business_name || "",
          logo_path: result.logo_path || "",
          address: result.address || "",
          city: result.city || "",
          postal_code: result.postal_code || "",
          phone: normalizePhilippinePhone(result.phone || ""),
          email: result.email || "",
          tax_id: result.tax_id || "",
          currency: result.currency || "PHP",
          vat_rate: result.vat_rate || 0,
          language: result.language || language,
        });
        setLogoPreview("");
        setPendingLogoUpload(null);
        // Load logo preview if exists
        if (result.logo_path) {
          try {
            const api = getElectronAPI();
            if (api?.file?.read) {
              const logoData = await api.file.read(result.logo_path);
              setLogoPreview(logoData);
            }
          } catch (error) {
            console.error("[BusinessSettings] Error loading logo:", error);
            setLogoPreview("");
          }
        }
      } else {
        // Initialize with default values if no settings exist
        setSettings({
          id: 0,
          business_name: "",
          logo_path: "",
          address: "",
          city: "",
          postal_code: "",
          phone: "",
          email: "",
          tax_id: "",
          currency: "PHP",
          vat_rate: 0,
          language,
        });
        setLogoPreview("");
        setPendingLogoUpload(null);
      }
    } catch (error) {
      console.error("[BusinessSettings] Error loading settings:", error);
      // Set default values on error
      setSettings({
        id: 0,
        business_name: "",
        logo_path: "",
        address: "",
        city: "",
        postal_code: "",
        phone: "",
        email: "",
        tax_id: "",
        currency: "PHP",
        vat_rate: 0,
        language,
      });
      setLogoPreview("");
      setPendingLogoUpload(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    if (name === "language") {
      void setLanguage(value as Language);
    }

    setSettings((prev) =>
      prev
        ? {
            ...prev,
            [name]: ["vat_rate"].includes(name) ? parseFloat(value) : value,
          }
        : null,
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && settings) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        if (typeof data === "string") {
          setLogoPreview(data);
          setPendingLogoUpload({
            dataUrl: data,
            fileName: file.name,
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const buildLogoFileName = () => {
    const originalFileName = pendingLogoUpload?.fileName || "logo.png";
    const extension =
      originalFileName.includes(".")
        ? originalFileName.split(".").pop()?.toLowerCase()
        : "png";

    const normalizedName =
      settings?.business_name
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "business-logo";

    return `${normalizedName}-${Date.now()}.${extension || "png"}`;
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      let logoPath = settings.logo_path;
      if (pendingLogoUpload) {
        logoPath =
          (await safeFileSave(buildLogoFileName(), pendingLogoUpload.dataUrl, "logos")) ||
          settings.logo_path;
      }

      await db.run(
        `UPDATE business_settings SET 
          business_name = ?, logo_path = ?, address = ?, city = ?, postal_code = ?,
          phone = ?, email = ?, tax_id = ?, currency = ?, vat_rate = ?, language = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          settings.business_name,
          logoPath,
          settings.address,
          settings.city,
          settings.postal_code,
          normalizePhilippinePhone(settings.phone),
          settings.email,
          settings.tax_id,
          settings.currency,
          settings.vat_rate,
          settings.language || language,
          settings.id,
        ],
      );

      setPendingLogoUpload(null);
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              logo_path: logoPath,
              phone: normalizePhilippinePhone(prev.phone),
            }
          : prev,
      );

      await showAlert({ title: t("changes"), confirmLabel: t("close") });
    } catch (error) {
      console.error("Error saving settings:", error);
      await showAlert({ title: t("error"), confirmLabel: t("close") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">{t("loadingSettings")}</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">{t("errorLoadingSettings")}</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("businessSettings")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("configureBusinessInfo")}
        </p>
      </div>

      {/* Logo Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("businessLogo")}</h2>
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Business Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span className="text-sm text-muted-foreground text-center p-4">
                {t("noLogo")}
              </span>
            )}
          </div>
          <div className="flex-1">
            <label className="block mb-4">
              <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors w-fit">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">{t("uploadLogo")}</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {t("recommendedLogo")}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("logoStorageInfo")}
            </p>
            {pendingLogoUpload && (
              <p className="text-xs text-muted-foreground mt-2 break-all">
                {t("selectedLogoFile")} {pendingLogoUpload.fileName}
              </p>
            )}
            {settings.logo_path && (
              <p className="text-xs text-muted-foreground mt-2 break-all">
                {t("currentLogoLocation")} {settings.logo_path}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Business Info Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("businessInfo")}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("businessName")} *
              </label>
              <Input
                name="business_name"
                value={settings.business_name}
                onChange={handleChange}
                placeholder="Your Shop Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("taxId")}
              </label>
              <Input
                name="tax_id"
                value={settings.tax_id}
                onChange={handleChange}
                placeholder="e.g., 123-456-789"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("phone")}</label>
              <PhoneInput
                value={settings.phone}
                onValueChange={(value) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          phone: value,
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("email")}</label>
              <Input
                name="email"
                value={settings.email}
                onChange={handleChange}
                placeholder="info@yourshop.com"
                type="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("address")}</label>
            <textarea
              name="address"
              value={settings.address}
              onChange={handleChange}
              placeholder="Street address"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("city")}</label>
              <Input
                name="city"
                value={settings.city}
                onChange={handleChange}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("postalCode")}
              </label>
              <Input
                name="postal_code"
                value={settings.postal_code}
                onChange={handleChange}
                placeholder="12345"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Invoice Settings Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("invoiceSettings")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t("currency")}</label>
            <select
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="PHP">PHP (₱) - Philippine Peso</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("taxRate")}
            </label>
            <Input
              type="number"
              name="vat_rate"
              value={settings.vat_rate}
              onChange={handleChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("vatHelpText")}
            </p>
          </div>
        </div>
      </Card>

      {/* Preferences Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("preferences")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t("language")}</label>
            <select
              name="language"
              value={settings.language || "en"}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="en">{t("english")}</option>
              <option value="tl">{t("tagalog")}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={loadSettings}>
          {t("reset")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("savingSettings") : t("saveSettings")}
        </Button>
      </div>
    </div>
  );
};

export default BusinessSettingsPage;
