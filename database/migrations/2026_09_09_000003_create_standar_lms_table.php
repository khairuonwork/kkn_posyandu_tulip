<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('standar_lms', function (Blueprint $table) {
            $table->id();
            $table->string('versi', 20);
            $table->string('indeks', 10);
            $table->string('jk', 1);
            // Umur dalam bulan untuk indeks *_U, panjang/tinggi cm untuk BB_TB.
            $table->decimal('kunci', 5, 1);
            // L, M, S disimpan per baris, bukan per tabel. Lihat OI-05 di
            // docs/99-open-issues.md: koreksi nanti cukup dengan seed versi baru.
            $table->decimal('l', 10, 6);
            $table->decimal('m', 10, 6);
            $table->decimal('s', 10, 6);

            $table->unique(['versi', 'indeks', 'jk', 'kunci'], 'standar_lms_unik');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('standar_lms');
    }
};
