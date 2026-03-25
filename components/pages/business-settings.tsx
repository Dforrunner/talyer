'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import { db } from '@/lib/db';
import { safeFileSave, getElectronAPI } from '@/lib/electron-api';

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

const BusinessSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await db.get('SELECT * FROM business_settings LIMIT 1');
      if (result) {
        setSettings({
          ...result,
          business_name: result.business_name || '',
          logo_path: result.logo_path || '',
          address: result.address || '',
          city: result.city || '',
          postal_code: result.postal_code || '',
          phone: result.phone || '',
          email: result.email || '',
          tax_id: result.tax_id || '',
          currency: result.currency || 'PHP',
          vat_rate: result.vat_rate || 0,
          language: result.language || 'en',
        });
        // Load logo preview if exists
        if (result.logo_path) {
          try {
            const api = getElectronAPI();
            if (api?.file?.read) {
              const logoData = await api.file.read(result.logo_path);
              setLogoPreview(logoData);
            }
          } catch (error) {
            console.error('[BusinessSettings] Error loading logo:', error);
          }
        }
      } else {
        // Initialize with default values if no settings exist
        setSettings({
          id: 0,
          business_name: '',
          logo_path: '',
          address: '',
          city: '',
          postal_code: '',
          phone: '',
          email: '',
          tax_id: '',
          currency: 'PHP',
          vat_rate: 0,
          language: 'en',
        });
      }
    } catch (error) {
      console.error('[BusinessSettings] Error loading settings:', error);
      // Set default values on error
      setSettings({
        id: 0,
        business_name: '',
        logo_path: '',
        address: '',
        city: '',
        postal_code: '',
        phone: '',
        email: '',
        tax_id: '',
        currency: 'PHP',
        vat_rate: 0,
        language: 'en',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => prev ? {
      ...prev,
      [name]: ['vat_rate'].includes(name) ? parseFloat(value) : value
    } : null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && settings) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        if (typeof data === 'string') {
          setLogoPreview(data);
          // Store the base64 data path reference
          setSettings(prev => prev ? {
            ...prev,
            logo_path: `logo_${Date.now()}.txt`
          } : null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      
      // Save logo if preview exists
      let logoPath = settings.logo_path;
      if (logoPreview && !settings.logo_path?.startsWith('logo_')) {
        logoPath = await safeFileSave(
          `logo_${Date.now()}.txt`,
          logoPreview
        ) || settings.logo_path;
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
          settings.phone,
          settings.email,
          settings.tax_id,
          settings.currency,
          settings.vat_rate,
          settings.language || 'en',
          settings.id
        ]
      );

      alert('Business settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving business settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Error loading settings</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Business Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your business information for invoices</p>
      </div>

      {/* Logo Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Business Logo</h2>
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Business Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span className="text-sm text-muted-foreground text-center p-4">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <label className="block mb-4">
              <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors w-fit">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Upload Logo</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, 200x200px, PNG or JPG
            </p>
          </div>
        </div>
      </Card>

      {/* Business Info Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Business Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Name *</label>
              <Input
                name="business_name"
                value={settings.business_name}
                onChange={handleChange}
                placeholder="Your Shop Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tax ID / VAT Number</label>
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
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
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
            <label className="block text-sm font-medium mb-2">Address</label>
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
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                name="city"
                value={settings.city}
                onChange={handleChange}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Postal Code</label>
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
        <h2 className="text-lg font-semibold mb-4">Invoice Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Currency</label>
            <select
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="PHP">PHP (₱) - Philippine Peso</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="CAD">CAD ($) - Canadian Dollar</option>
              <option value="AUD">AUD ($) - Australian Dollar</option>
              <option value="JPY">JPY (¥) - Japanese Yen</option>
              <option value="CHF">CHF (CHF) - Swiss Franc</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">VAT/Tax Rate (%)</label>
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
            <p className="text-xs text-muted-foreground mt-1">Set to 0 to disable VAT on invoices</p>
          </div>
        </div>
      </Card>

      {/* Preferences Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select
              name="language"
              value={settings.language || 'en'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="en">English</option>
              <option value="tl">Tagalog</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={loadSettings}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default BusinessSettingsPage;
