# Audit modul prioritas Adidaya — 18 Oktober 2026

Lingkup: Clock In/Out, Finance (pengajuan, approval, pembayaran), Crew (daily log, payroll, request), serta notifikasi terkait. Modul lain ditunda.

## Keputusan

**Belum siap pindah live untuk seluruh lingkup ini.** Clock dan transaksi Finance dasar memiliki jalur database serta pemeriksaan lokal yang tersedia, tetapi belum melewati uji akun nyata. Crew dan konsolidasi Finance memiliki blocker fungsional. Keberhasilan build bukan bukti transaksi produksi berhasil.

Audit ini tidak mengirim pengajuan, melakukan approval/pembayaran, mencatat absensi, menjalankan migrasi, atau mengirim notifikasi produksi. Tidak ada perbaikan source transaksi dilakukan pada audit ini; temuan di bawah masih terbuka.

## Bukti verifikasi

- Build web berhasil.
- 26 tes pada `tests/adidaya-mode.test.cjs` dan `tests/release-readiness.test.cjs` lolos. Mencakup penjagaan identitas Clock, error penyimpanan, izin Finance, partial payment purchasing, bukti pembayaran, race update, inbox pribadi, dan pemetaan tujuan notifikasi. Tes ini tidak menggantikan penerimaan transaksi nyata.
- Probe read-only memverifikasi kolom yang diperiksa pada 13 tabel inti. RLS, isi data, constraint upsert, storage upload, dan trigger aktual tidak dapat dibuktikan oleh probe anonim.
- `purchasing_consolidations` dan `purchasing_consolidation_requests` tidak tersedia di schema cache (PGRST205).
- Bukti terstruktur: `priority-modules-audit.json`.

## Clock In/Out

Status: siap untuk uji penerimaan, belum dinyatakan lancar end-to-end.

Adapter `lib/api/adidayaClock.ts` mempertahankan penulisan Adidaya ke attendance logs, sessions, dan records; mensyaratkan user aktif, foto, serta koordinat. Ada penjagaan klik berulang dalam satu proses dan error operasi kritis. Penyimpanan melibatkan beberapa operasi, sehingga belum atomik: kegagalan di tengah harus ditangani dengan refresh sebelum retry. Perlu uji kamera web/iPad/HP, penolakan izin lokasi, lokasi lambat, Clock In kemudian Out, refresh, dan retry jaringan tanpa sesi ganda.

## Finance

Status: transaksi dasar siap untuk uji akun, seluruh fitur belum lengkap.

Purchasing menggunakan `created_by`; reimbursement menggunakan `user_id`. Kolom dan item dasar tersedia. Approval serta pembayaran memiliki pemeriksaan role; purchasing mendukung partial payment dan menggabungkan bukti, reimbursement tidak bergantung pada kolom `paid_amount` yang memang tidak ada. Perlu uji masing-masing draft → submit → approve/reject/revision → resubmit → bayar, jumlah outstanding, invoice/proof lebih dari satu, dan klik bayar dua kali.

**Blocker: konsolidasi.** Kedua tabel konsolidasi belum tersedia. Kontrol cloud konsolidasi sebelumnya dijaga agar tidak berpura-pura berhasil melalui penyimpanan lokal. Karena lingkup pengguna adalah seluruh Finance, ini belum boleh disebut lengkap. Migrasi harus ditinjau terhadap skema dan role Adidaya sebelum dijalankan.

Parent request dan item masih ditulis terpisah. Jika insert item gagal setelah parent tersimpan, aplikasi harus mengarahkan pengguna memperbaiki request yang sudah ada, bukan submit ulang membentuk duplikat. Ini perlu uji kegagalan yang dikontrol.

## Crew

### Daily log

Tabel dan kolom dasar tersedia. `lib/api/crew.ts` menggunakan upsert `crew_id,date,project_code`; constraint tersebut perlu diuji dengan akun nyata. Pembacaan sebagian data dapat tersamar sebagai hasil kosong/parsial karena fetch menelan error. Jangan memakai hasil parsial untuk payroll.

Kesejajaran fitur aplikasi lama belum lengkap: original menyediakan rating dan penguncian/pembukaan tanggal masa depan, sedangkan API preview belum memiliki operasi ekuivalen. Verifikasi pembatasan tanggal dan hak edit sebelum penggunaan operasional.

### Request dan approval — blocker

- `saveCrewRequest` belum mengisi `created_by` saat insert. Trigger notifikasi hasil approval di source Adidaya mengharuskan `NEW.created_by IS NOT NULL`; akibatnya pemohon bisa tidak menerima hasilnya.
- `approved_by` dan `approved_at` tersedia di database dan diisi API lama, tetapi belum diisi preview.
- Layar Crew preview hanya mengambil `isAuthenticated`, tanpa gate approval sesuai role lama. Original menampilkan approval kepada admin/superadmin/administrator/supervisor. Perlindungan RLS yang sedang terpasang belum diaudit; autentikasi saja bukan bukti hak approval.
- Pemilihan workspace menggunakan baris pertama yang terlihat (`limit(1)`) atau fallback UUID; perlu diikat ke konteks Adidaya yang terverifikasi.
- Persetujuan leave masih mempunyai fallback kode proyek literal jika proyek tidak ditemukan. Jangan membuat log cuti pada proyek tebakan.

### Payroll — blocker untuk adjustment permanen

Perhitungan mengambil daily log serta request APPROVED, termasuk potongan kasbon, reimbursement, hari libur, dan lembur. Namun adjustment di `CrewPayrollTab.tsx` hanya `useState`; hilang saat halaman dimuat ulang dan tidak dibatasi per periode dalam penyimpanan permanen. Tabel bernama `crew_payroll_adjustments` juga tidak tersedia; ini bukan alasan untuk membuat tabel baru tanpa desain skema yang benar.

Original mempunyai pilihan weekly/monthly; preview berfokus weekly. Perlu keputusan implementasi persistensi dan periode, disertai perbandingan nilai payroll terhadap aplikasi lama menggunakan data yang sama. Perhitungan payroll bukan bukti adanya pencatatan transfer/pembayaran payroll.

## Notifikasi — blocker penerima dan pembuktian trigger

Inbox, mark read/all read, realtime, history, deep link, dan registrasi push tersedia. Tabel notifications dan push_subscriptions terverifikasi secara skema. Pengiriman push sebenarnya belum diuji.

Source preview saat audit ini mempunyai `notifyCrewAction` → `addLocalNotification`, dengan default penerima seluruh profil yang terlihat untuk kategori Crew. Itu tidak sama dengan trigger Crew Request Adidaya yang menargetkan management untuk permintaan baru dan pembuat request untuk perubahan status. Kombinasi writer frontend dan trigger database juga berpotensi menggandakan pesan. Harus ada satu sumber event dan pemetaan penerima eksplisit yang sama dengan Adidaya.

Ketersediaan SQL trigger dalam repo tidak membuktikan trigger itu aktif di database produksi. Perlu uji satu submit/approve/reject/payment dan pemeriksaan penerima serta jumlah notifikasinya. Deep link Crew lama membawa `tab=requests&requestId=...`; preview membaca parameter `notificationAction`/`notificationRef`, sehingga membuka request spesifik perlu dipastikan, bukan hanya mendarat di modul.

## Urutan sebelum live

1. Selesaikan identitas pembuat/penyetuju, role approval, workspace, serta error handling Crew.
2. Pastikan payroll/adjustment tersimpan sesuai periode dan hasilnya cocok dengan Adidaya lama.
3. Lengkapi konsolidasi Finance dengan skema yang ditinjau.
4. Samakan writer/trigger/penerima notifikasi dan tautan objek spesifik, tanpa duplikasi.
5. Jalankan penerimaan terkendali dengan akun staff, approver, dan finance pada Clock, purchasing, reimbursement, Crew, dan push. Catat ID transaksi dan verifikasi persistence setelah refresh. Jangan memakai pembayaran sungguhan sebagai tes tanpa otorisasi spesifik.
