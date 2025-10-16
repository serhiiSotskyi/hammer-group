import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_ORIGIN}/api/contact/general`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      toast({ title: 'Submission failed', description: 'Please try again later.', variant: 'destructive' as any });
    }
  };

  const contactInfo = [
    { icon: MapPin, title: t('contact.info.visit'), details: [t('contact.info.city'), t('contact.info.street'), t('contact.info.appointment')] },
    { icon: Phone, title: t('contact.info.call'), details: [t('contact.info.phone1'), t('contact.info.phone2'), t('contact.info.free')] },
    { icon: Mail,  title: t('contact.info.emailUs'), details: [t('contact.info.email'), t('contact.info.quick')] },
    { icon: Clock, title: t('contact.info.hours'), details: [t('contact.info.range')] },
  ];

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">{t('contact.title')}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('contact.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contactInfo.map((info, index) => (
                <Card key={index} className="h-full transition-all duration-300 hover:shadow-[var(--shadow-card)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                        <info.icon className="w-5 h-5 text-accent" />
                      </div>
                      {info.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {info.details.map((detail, idx) => (
                      <p key={idx} className={`${idx === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'} ${idx > 0 ? 'text-sm' : ''}`}>
                        {detail}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Map */}
            <Card>
              <CardContent className="p-0">
                <div className="rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2748.8463064685084!2d30.734479776718167!3d46.45174227110723!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c633d677300001%3A0x88bdde9547a08f98!2sHammer%20Doors!5e0!3m2!1sen!2suk!4v1758901533810!5m2!1sen!2suk"
                    className="w-full h-[400px]"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Hammer Doors Location"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-playfair">{t('contact.send')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.name')}</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder={t('contact.name')}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.phone')}</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder={t('contact.info.phone1')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.email')}</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="your.email@domain.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">{t('contact.details')}</label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder={t('contact.detailsPlaceholder')}
                      rows={6}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button type="submit" className="premium-button flex-1 group">
                      <Send className="mr-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                      {t('contact.send')}
                    </Button>
                   
                  </div>

                  <p className="text-sm text-muted-foreground text-center">{t('contact.info.responseTime')}</p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
