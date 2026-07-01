import { createClient } from '@supabase/supabase-js';
import { classifyBullying } from '../lib/ai/bullyingClassifier';
import { analyzeUrgency } from '../lib/ai/urgencyAnalysis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reclassifyAll() {
  console.log("Fetching all reports from database...");
  const { data: reports, error } = await supabase
    .from('reports')
    .select('*');

  if (error) {
    console.error("Error fetching reports:", error);
    return;
  }

  console.log(`Found ${reports.length} reports. Beginning re-classification...`);

  for (const r of reports) {
    console.log(`\n-----------------------------------------`);
    console.log(`Processing Report ${r.tracking_code} (ID: ${r.id})...`);
    console.log(`Content: "${r.content.substring(0, 100)}..."`);
    console.log(`Current Category: ${r.category}`);
    console.log(`Current AI Primary Type: ${r.ai_analysis?.classification?.primary_type}`);

    try {
      // 1. Run AI classification
      const classification = await classifyBullying(r.content);
      console.log(`New AI Primary Type: ${classification.primary_type} (Confidence: ${classification.confidence_score}%)`);

      // Delay before next AI call (6 seconds) to prevent rate limits
      await new Promise(res => setTimeout(res, 6000));

      // 2. Run Urgency Analysis
      const urgency = await analyzeUrgency(
        r.content,
        classification.primary_type,
        r.location || 'Bilinmiyor',
        r.frequency || 'Bilinmiyor'
      );

      // 3. Risk Level calculation
      const suicideKeywords = ["intihar", "kendimi öldür", "canıma kıy", "her şeyi bitir", "yaşamak istemi", "ölmek isti"];
      const hasSuicideKeyword = suicideKeywords.some(keyword => r.content.toLowerCase().includes(keyword));

      let finalRiskLevel = r.risk_level;
      if (hasSuicideKeyword) {
        finalRiskLevel = "Bordo";
        urgency.urgency_score = 100;
        urgency.urgency_label = "Acil";
        if (!urgency.keywords_detected) urgency.keywords_detected = [];
        if (!urgency.keywords_detected.some((k: string) => k.toLowerCase().includes("intihar"))) {
          urgency.keywords_detected.push("intihar");
        }
      } else {
        // Clean up hallucinated 'intihar' keyword if no actual suicide intent is found in content
        if (urgency.keywords_detected) {
          urgency.keywords_detected = urgency.keywords_detected.filter(
            (k: string) => !k.toLowerCase().includes("intihar")
          );
        }

        if (urgency.urgency_score >= 80) {
          finalRiskLevel = "Bordo";
        } else if (urgency.urgency_score >= 60) {
          finalRiskLevel = "Kırmızı";
        } else if (urgency.urgency_score >= 40) {
          finalRiskLevel = "Turuncu";
        } else {
          finalRiskLevel = "Sarı";
        }
      }

      const aiAnalysis = {
        urgency,
        classification,
        analyzed_at: new Date().toISOString()
      };

      // 4. Update Supabase
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          ai_analysis: aiAnalysis,
          risk_level: finalRiskLevel
        })
        .eq('id', r.id);

      if (updateError) {
        console.error(`Failed to update report ${r.tracking_code}:`, updateError);
      } else {
        console.log(`Success! Updated report ${r.tracking_code} to Primary Type: ${classification.primary_type}, Risk Level: ${finalRiskLevel}`);
      }

      // Larger delay to respect rate limits (6 seconds)
      await new Promise(res => setTimeout(res, 6000));
    } catch (err: any) {
      console.error(`Error processing report ${r.tracking_code}:`, err.message);
    }
  }

  console.log("\nRe-classification migration completed successfully!");
}

reclassifyAll();
