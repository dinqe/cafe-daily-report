import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const paymentFields = [
  { key: 'nakit_tahsilat', label: 'Nakit Tahsilat' },
  { key: 'kredi_karti', label: 'Kredi Kartı' },
  { key: 'multinet', label: 'Multinet' },
  { key: 'ticket', label: 'Ticket' },
  { key: 'sodexo', label: 'Sodexo' },
  { key: 'setcard', label: 'Setcard' },
  { key: 'paye_kart', label: 'Paye Kart' },
  { key: 'metropol_kart', label: 'Metropol Kart' },
  { key: 'online_odeme', label: 'Online Ödeme' },
  { key: 'labcoin', label: 'Labcoin' },
] as const;

const kasaFields = [
  { key: 'kasa_avansi', label: 'Kasa Avansı' },
  { key: 'kasa_devir', label: 'Kasa Devir' },
  { key: 'masraf', label: 'Masraf' },
  { key: 'bankaya_yatan', label: 'Bankaya Yatan' },
] as const;

type FormData = Record<string, number>;

export default function Entry() {
  const { user, userRole } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [form, setForm] = useState<FormData>({});
  const [simpra, setSimpra] = useState(0);
  const [zRaporu, setZRaporu] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const branchId = userRole?.branch_id;

  // Check if already submitted for selected date
  useEffect(() => {
    if (!branchId) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    supabase.from('daily_reports').select('id').eq('branch_id', branchId).eq('date', dateStr).maybeSingle()
      .then(({ data }) => {
        setAlreadySubmitted(!!data);
        setExistingId(data?.id ?? null);
      });
  }, [date, branchId]);

  const val = (key: string) => form[key] || 0;
  const setVal = (key: string, v: string) => {
    const num = parseFloat(v) || 0;
    setForm(prev => ({ ...prev, [key]: num }));
  };

  const toplamCiro = useMemo(() =>
    paymentFields.reduce((sum, f) => sum + val(f.key), 0),
    [form]
  );

  const ciroSimpraFark = toplamCiro - simpra;
  const toplamKasaBakiye = val('kasa_avansi') + val('kasa_devir');
  const netKasaBakiye = toplamKasaBakiye - val('masraf') - val('bankaya_yatan');
  const zRaporuFark = toplamCiro - zRaporu;

  const handleSubmit = async () => {
    if (!user || !branchId) return;
    setSaving(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const payload = {
      branch_id: branchId,
      user_id: user.id,
      date: dateStr,
      ...Object.fromEntries(paymentFields.map(f => [f.key, val(f.key)])),
      ...Object.fromEntries(kasaFields.map(f => [f.key, val(f.key)])),
      toplam_ciro: toplamCiro,
      simpra_toplami: simpra,
      ciro_simpra_fark: ciroSimpraFark,
      toplam_kasa_bakiye: toplamKasaBakiye,
      net_kasa_bakiye: netKasaBakiye,
      z_raporu_toplami: zRaporu,
      z_raporu_fark: zRaporuFark,
      notes,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from('daily_reports').update(payload).eq('id', existingId));
    } else {
      ({ error } = await supabase.from('daily_reports').insert(payload));
    }

    if (error) {
      toast.error('Kayıt başarısız: ' + error.message);
    } else {
      toast.success(existingId ? 'Rapor güncellendi!' : 'Rapor kaydedildi!');
      setAlreadySubmitted(true);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Günlük Rapor Girişi</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              {format(date, 'd MMM yyyy', { locale: tr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {alreadySubmitted && (
        <div className="flex items-center gap-2 rounded-md border border-warning bg-accent p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span>Bu tarih için zaten rapor girilmiş. Kaydederseniz güncellenecektir.</span>
        </div>
      )}

      {/* Ödeme Yöntemleri */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ödeme Yöntemleri</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {paymentFields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input type="number" step="0.01" value={form[f.key] || ''} onChange={e => setVal(f.key, e.target.value)} placeholder="0" />
            </div>
          ))}
          <div className="col-span-2 pt-2 border-t border-border">
            <div className="flex justify-between text-sm font-medium">
              <span>Toplam Ciro</span>
              <span className="text-primary">{toplamCiro.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Simpra Toplamı</Label>
            <Input type="number" step="0.01" value={simpra || ''} onChange={e => setSimpra(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ciro - Simpra Farkı</Label>
            <Input value={ciroSimpraFark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} readOnly className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Kasa Özeti */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kasa Özeti</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Kasa Avansı</Label>
            <Input type="number" step="0.01" value={form['kasa_avansi'] || ''} onChange={e => setVal('kasa_avansi', e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kasa Devir</Label>
            <Input type="number" step="0.01" value={form['kasa_devir'] || ''} onChange={e => setVal('kasa_devir', e.target.value)} placeholder="0" />
          </div>
          <div className="col-span-2 flex justify-between text-sm font-medium border-t border-border pt-2">
            <span>Toplam Kasa Bakiye</span>
            <span className="text-primary">{toplamKasaBakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Masraf</Label>
            <Input type="number" step="0.01" value={form['masraf'] || ''} onChange={e => setVal('masraf', e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bankaya Yatan</Label>
            <Input type="number" step="0.01" value={form['bankaya_yatan'] || ''} onChange={e => setVal('bankaya_yatan', e.target.value)} placeholder="0" />
          </div>
          <div className="col-span-2 flex justify-between text-sm font-medium border-t border-border pt-2">
            <span>Net Kasa Bakiye</span>
            <span className="text-primary">{netKasaBakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
          </div>
        </CardContent>
      </Card>

      {/* Z Raporu */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Z Raporu</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Z Raporu Toplamı</Label>
            <Input type="number" step="0.01" value={zRaporu || ''} onChange={e => setZRaporu(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Z Raporu Farkı</Label>
            <Input value={zRaporuFark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} readOnly className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Notlar */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs">Notlar</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ek notlar..." className="mt-1" />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={saving} className="w-full gap-2">
        <Check className="h-4 w-4" />
        {saving ? 'Kaydediliyor...' : existingId ? 'Güncelle' : 'Kaydet'}
      </Button>
    </div>
  );
}
