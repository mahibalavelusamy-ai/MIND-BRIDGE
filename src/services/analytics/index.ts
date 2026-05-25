import { DataIntakeLayer, RawDataInput } from './dataIntake';
import { ProcessingEngine } from './processingEngine';
import { RiskScoringEngine } from './riskEngine';
import { AIInterpreter } from './aiInterpreter';
import { AlertEngine } from './alertEngine';
import { PermissionFilter } from './permissionFilter';

export const AnalyticsPipeline = {
  /**
   * Main entry point for processing new data events.
   * Runs the full analysis pipeline.
   */
  async processEvent(input: RawDataInput, currentHistory: any, previousRisk: any, viewerRole: string) {
    // 1. Data Intake
    const normalizedData = await DataIntakeLayer.collect(input);
    
    // Add to history (simulated for pipeline architecture)
    const updatedHistory = [...(currentHistory || []), normalizedData];
    
    // 2. Processing Layer
    const trends = ProcessingEngine.calculateTrends(updatedHistory);
    const overload = ProcessingEngine.analyzeAcademicOverload(updatedHistory);
    const activity = { activityDropPercent: 0.1 }; // Mock calculation
    
    const processedData = { trends, overload, activity };
    
    // 3. Risk Engine
    const currentRisk = RiskScoringEngine.generateRiskProfile(processedData);
    
    // 4. Alert Engine
    let alerts = AlertEngine.evaluateRiskProfile(input.userId, currentRisk, previousRisk);
    
    // 5. AI Interpretation
    const aiInsight = await AIInterpreter.generateSupportiveSummary(currentRisk, viewerRole as "parent" | "teacher" | "student");
    
    // 6. Permission Filtering
    const rawOutput = {
      risk: currentRisk,
      alerts,
      insight: aiInsight,
      rawCheckins: updatedHistory // Normally sensitive
    };
    
    const safeOutput = PermissionFilter.filterInsights(rawOutput, viewerRole);
    safeOutput.alerts = PermissionFilter.filterAlerts(alerts, viewerRole);
    
    return safeOutput;
  }
};

export {
  DataIntakeLayer,
  ProcessingEngine,
  RiskScoringEngine,
  AIInterpreter,
  AlertEngine,
  PermissionFilter
};
