import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type Report = {
  id: string;
  date: string;
  toplam_ciro: number;
  net_kasa_bakiye: number;
  z_raporu_toplami: number;
  z_raporu_fark: number;
  nakit_tahsilat: number;
  kredi_karti: number;
  multinet: number;
  ticket: number;
  sodexo: number;
  setcard: number;
  paye_kart: number;
  metropol_kart: number;
  online_odeme: number;
  labcoin: number;
  simpra_toplami: number;
  ciro_simpra_fark: number;
  kasa_avansi: number;
  kasa_devir: number;
  toplam_kasa_bakiye: number;
  masraf: number;
  bankaya_yatan: number;
  notes: string | null;
};

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

export default function HistoryPage() {
  const { userRole } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    if (!userRole?.branch_id) return;
    supabase.from('daily_reports')
      .select('*')
      .eq('branch_id', userRole.branch_id)
      .order('date', { ascending: false })
      .then(({ data }) => data && setReports(data as Report[]));
  }, [userRole]);

  const exportCSV = () => {
    const headers = ['Tarih', 'Toplam Ciro', 'Net Kasa Bakiye', 'Z Raporu', 'Z Raporu Fark'];
    const rows = reports.map(r => [r.date, r.toplam_ciro, r.net_kasa_bakiye, r.z_raporu_toplami, r.z_raporu_fark]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raporlar_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const detailRows = selected ? [
    ['Nakit Tahsilat', fmt(selected.nakit_tahsilat)],
    ['Kredi Kartı', fmt(selected.kredi_karti)],
    ['Multinet', fmt(selected.multinet)],
    ['Ticket', fmt(selected.ticket)],
    ['Sodexo', fmt(selected.sodexo)],
    ['Setcard', fmt(selected.setcard)],
    ['Paye Kart', fmt(selected.paye_kart)],
    ['Metropol Kart', fmt(selected.metropol_kart)],
    ['Online Ödeme', fmt(selected.online_odeme)],
    ['Labcoin', fmt(selected.labcoin)],
    ['Toplam Ciro', fmt(selected.toplam_ciro)],
    ['Simpra Toplamı', fmt(selected.simpra_toplami)],
    ['Ciro - Simpra Fark', fmt(selected.ciro_simpra_fark)],
    ['Kasa Avansı', fmt(selected.kasa_avansi)],
    ['Kasa Devir', fmt(selected.kasa_devir)],
    ['Toplam Kasa Bakiye', fmt(selected.toplam_kasa_bakiye)],
    ['Masraf', fmt(selected.masraf)],
    ['Bankaya Yatan', fmt(selected.bankaya_yatan)],
    ['Net Kasa Bakiye', fmt(selected.net_kasa_bakiye)],
    ['Z Raporu Toplamı', fmt(selected.z_raporu_toplami)],
    ['Z Raporu Farkı', fmt(selected.z_raporu_fark)],
  ] : [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Geçmiş Raporlar</h1>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" /> CSV İndir
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Toplam Ciro</TableHead>
                <TableHead className="text-right">Net Kasa</TableHead>
                <TableHead className="text-right">Z Farkı</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                  <TableCell>{format(new Date(r.date), 'd MMM yyyy', { locale: tr })}</TableCell>
                  <TableCell className="text-right">{fmt(r.toplam_ciro)} ₺</TableCell>
                  <TableCell className="text-right">{fmt(r.net_kasa_bakiye)} ₺</TableCell>
                  <TableCell className="text-right">{fmt(r.z_raporu_fark)} ₺</TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Henüz rapor bulunmuyor</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected && format(new Date(selected.date), 'd MMMM yyyy', { locale: tr })} Detay</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {detailRows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value} ₺</span>
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
