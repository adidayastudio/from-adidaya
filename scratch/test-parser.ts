import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { localParseCrewPrompt } from "../lib/stream/crew-intelligence";

const testPrompts = [
    "Ada berapa crew aktif?",
    "Total crew semua berapa?",
    "Crew JPF berapa?",
    "Siapa saja crew JPF?",
    "Tukang listrik ada berapa?",
    "Siapa tukang listrik di JPF?",
    "Siapa yang belum punya proyek?",
    "Siapa crew baru bulan ini?",
    "Siapa crew paling lama?",
    "Siapa yang inactive?",
    "Harga tukang ARIF berapa?",
    "Rata-rata rate crew berapa?",
    "Si A sekarang di proyek mana?",
    "Siapa saja yang ditugaskan ke JPF?",
    "JPF ada berapa crew assigned?",
    "Siapa yang belum punya assignment?",
    "Siapa yang mulai minggu ini?",
    "Siapa yang selesai minggu ini?",
    "Siapa yang paling lama di JPF?",
    "Hari ini yang masuk berapa?",
    "JPF hari ini masuk berapa?",
    "Siapa yang tidak hadir?",
    "Siapa yang alpa?",
    "Berapa yang cuti?",
    "Siapa yang setengah hari?",
    "Siapa yang lembur?",
    "Total lembur hari ini berapa jam?",
    "Rata-rata overtime JPF berapa?",
    "Daily log JPF sudah lengkap?",
    "Siapa yang belum diisi?",
    "Ada berapa crew yang belum punya daily log?",
    "Payroll minggu ini berapa?",
    "Payroll JPF minggu ini berapa?",
    "Payroll bulan ini berapa?",
    "Gaji si ARIF minggu ini berapa?",
    "Kenapa gaji si ARIF tinggi?",
    "Kenapa gaji si ARIF turun?",
    "Minggu ini dibanding minggu lalu?",
    "KPI si ARIF berapa?",
    "Siapa rating tertinggi?",
    "Siapa rating terendah?",
    "Siapa status Monitor?",
    "Siapa status Replace?",
    "Rata-rata KPI JPF?",
    "Siapa yang perlu dievaluasi?",
    "Siapa kandidat replace?",
    "Kenapa si ARIF masuk Monitor?",
    "Siapa mengajukan cuti?",
    "Ada berapa cuti pending?",
    "Total kasbon bulan ini?",
    "Total kasbon JPF?",
    "Siapa kasbon paling besar?",
    "Kasbon pending ada berapa?",
    "Reimburse pending berapa?",
    "Total reimburse minggu ini?",
    "Kenapa payroll JPF naik minggu ini?",
    "Kenapa gaji Budi gede banget?",
    "Kenapa productivity crew terasa lambat?",
    "Apakah ada crew yang sebaiknya diganti?",
    "Crew JPF secara umum sehat tidak?",
    "Ada yang aneh gak minggu ini?"
];

const crewNames = ["ARIF", "AKSIN", "DAKIR", "DARNO", "DARSO", "FAUZAN", "FERI", "IFAN", "MIFTAHUL", "NELI", "NURUDIN", "NURUL", "PUPUT", "ROBBY", "BUDI"];

console.log("=== RUNNING CREW INTELLIGENCE ROUTER TESTS ===");

let passed = 0;
for (const prompt of testPrompts) {
    const res = localParseCrewPrompt(prompt, crewNames);
    console.log(`\nPrompt: "${prompt}"`);
    console.log(`-> Intent: ${res.intent}`);
    console.log(`-> Params: ${JSON.stringify(res.parameters)}`);
    console.log(`-> Confidence: ${res.confidence}`);
    passed++;
}

console.log(`\n=== Total tested prompts: ${passed} ===`);
