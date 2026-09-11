<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('periode', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('bulan');
            $table->unsignedSmallInteger('tahun');
            $table->date('tanggal_kegiatan')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'bulan', 'tahun']);
            $table->index(['tahun', 'bulan']);
        });

        Schema::create('pengukuran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anak_id')->constrained('anak')->cascadeOnDelete();
            $table->foreignId('periode_id')->constrained('periode')->cascadeOnDelete();
            $table->foreignId('dicatat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->date('tanggal_ukur');
            // Kosong berbeda dari nol: ketidakhadiran bukan berat badan 0 kg.
            $table->decimal('bb_kg', 5, 2)->nullable();
            // Nilai ukur asli, sebelum konversi PB/TB.
            $table->decimal('tinggi_cm', 5, 1)->nullable();
            $table->string('jenis_ukur', 2)->nullable();
            $table->decimal('lila_cm', 4, 1)->nullable();
            $table->decimal('lika_cm', 4, 1)->nullable();
            // Nilai mentah dari arsip. Tanpa logika turunan sampai OI-01 selesai.
            $table->string('ntob_raw', 8)->nullable();
            $table->string('status_kehadiran', 20)->default('hadir');
            $table->text('catatan')->nullable();
            $table->string('sumber', 10)->default('manual');
            $table->timestamps();

            // Satu rekam utama per anak per periode. Membuat impor ulang idempotent
            // dan mencegah penghitungan ganda pada rekap D/S.
            $table->unique(['anak_id', 'periode_id']);
            $table->index(['periode_id', 'status_kehadiran']);
            $table->index('tanggal_ukur');
        });

        Schema::create('penilaian_gizi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pengukuran_id')->constrained('pengukuran')->cascadeOnDelete();
            // Versi standar disimpan agar hasil lama tetap dapat ditelusuri
            // ketika standar diperbarui.
            $table->string('standar_versi', 20);
            $table->string('indeks', 10);
            $table->decimal('z_score', 6, 3)->nullable();
            $table->string('kategori', 40)->nullable();
            $table->boolean('tidak_wajar')->default(false);
            // Mis. {"jenis_ukur":"diasumsikan dari umur"} — membuat asumsi terlihat.
            $table->json('catatan_perhitungan')->nullable();
            $table->timestamp('dihitung_pada');
            $table->timestamps();

            $table->unique(['pengukuran_id', 'indeks', 'standar_versi'], 'penilaian_gizi_unik');
            $table->index(['indeks', 'kategori']);
        });

        Schema::create('layanan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anak_id')->constrained('anak')->cascadeOnDelete();
            $table->foreignId('periode_id')->nullable()->constrained('periode')->nullOnDelete();
            $table->string('jenis', 20);
            $table->string('keterangan')->nullable();
            $table->date('tanggal')->nullable();
            $table->timestamps();

            $table->index(['anak_id', 'jenis']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('layanan');
        Schema::dropIfExists('penilaian_gizi');
        Schema::dropIfExists('pengukuran');
        Schema::dropIfExists('periode');
    }
};
