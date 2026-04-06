import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, Building2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type Branch = { id: string; name: string; location: string | null };
type Report = Record<string, any>;

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

export default function Dashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => data && setBranches(data));
  }, []);

  useEffect(() => {
    const dateStr = format(date, 'yyyy-MM-dd');
    supabase.from('daily_reports').select('*').eq('date', dateStr)
      .then(({ data }) => data && setReports(data));
  }, [date]);

  const reportsByBranch = new Map(reports.map(r => [r.branch_id, r]));
  const submittedCount = reports.length;
  const totalRevenue = reports.reduce((s, r) => s + Number(r.toplam_ciro), 0);

  const detailFields = [
    ['Nakit Tahsilat', 'nakit_tahsilat'], ['Kredi Kartı', 'kredi_karti'],
    ['Multinet', 'multinet'], ['Ticket', 'ticket'], ['Sodexo', 'sodexo'],
    ['Setcard', 'setcard'], ['Paye Kart', 'paye_kart'], ['Metropol Kart', 'metropol_kart'],
    ['Online Ödeme', 'online_odeme'], ['Labcoin', 'labcoin'],
    ['Toplam Ciro', 'toplam_ciro'], ['Simpra Toplamı', 'simpra_toplami'],
    ['Ciro - Simpra Fark', 'ciro_simpra_fark'],
    ['Kasa Avansı', 'kasa_avansi'], ['Kasa Devir', 'kasa_devir'],
    ['Toplam Kasa Bakiye', 'toplam_kasa_bakiye'], ['Masraf', 'masraf'],
    ['Bankaya Yatan', 'bankaya_yatan'], ['Net Kasa Bakiye', 'net_kasa_bakiye'],
    ['Z Raporu Toplamı', 'z_raporu_toplami'], ['Z Raporu Farkı', 'z_raporu_fark'],
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Toplam Ciro
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(totalRevenue)} ₺</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Building2 className="h-3.5 w-3.5" /> Rapor Durumu
            </div>
            <p className="text-xl font-bold text-foreground">
              {submittedCount} / {branches.length}
              <span className="text-xs font-normal text-muted-foreground ml-1">şube</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Şube Detayları</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Şube</TableHead>
                <TableHead className="text-right">Ciro</TableHead>
                <TableHead className="text-right">Net Kasa</TableHead>
                <TableHead className="text-right">Z Fark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map(b => {
                const r = reportsByBranch.get(b.id);
                const missing = !r;
                return (
                  <TableRow
                    key={b.id}
                    className={cn('cursor-pointer', missing && 'bg-destructive/5')}
                    onClick={() => r && setSelected(r)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {missing && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                        {b.name}
                      </div>
                      {b.location && <span className="text-xs text-muted-foreground">{b.location}</span>}
                    </TableCell>
                    <TableCell className="text-right">{r ? fmt(Number(r.toplam_ciro)) + ' ₺' : '—'}</TableCell>
                    <TableCell className="text-right">{r ? fmt(Number(r.net_kasa_bakiye)) + ' ₺' : '—'}</TableCell>
                    <TableCell className="text-right">{r ? fmt(Number(r.z_raporu_fark)) + ' ₺' : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected && branches.find(b => b.id === selected.branch_id)?.name} — {format(date, 'd MMMM yyyy', { locale: tr })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {detailFields.map(([label, key]) => (
              <div key={key} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{selected ? fmt(Number(selected[key])) : '—'} ₺</span>
              </div>
            ))}
            {selected?.notes && (
              <div className="pt-2">
                <span className="text-xs text-muted-foreground">Notlar:</span>
                <p className="text-sm mt-1">{selected.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
