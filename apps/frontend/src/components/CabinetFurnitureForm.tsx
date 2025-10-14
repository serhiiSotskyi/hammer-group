import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function CabinetFurnitureForm() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch('http://localhost:4000/api/contact/furniture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setFormData({ name: '', email: '', phone: '', message: '' });
      toast({ title: t('contact.send'), description: t('contact.managerSoon') });
    } catch (err) {
      toast({ title: 'Submission failed', description: err instanceof Error ? err.message : 'Try again later', variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-playfair">{t('nav.furniture')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.name')}</label>
                  <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.phone')} *</label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.email').replace(/\s*\*$/, '')}</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.details')}</label>
                <Textarea required rows={6} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder={t('contact.detailsPlaceholder')} />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" className="premium-button flex-1" disabled={pending}>
                  <Send className="mr-2 w-4 h-4" /> {pending ? t('customizer.updating') : t('contact.send')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
