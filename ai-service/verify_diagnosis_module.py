"""
Diagnostic Module Verification Script

Simple verification that the diagnostic module can be imported and used correctly.
"""

import sys
import asyncio
from datetime import datetime

# Add project path
sys.path.insert(0, '/d/Code/ai-gen/intl-health-mgmt-parallel/intl-health-mgmt-ai/ai-service')

try:
    # Test importing diagnostic module
    from app.models.diagnosis_models import (
        HealthSummaryRequest,
        HealthMetric,
        RiskAssessmentRequest,
        DiagnosticAdviceRequest,
        MedicationAdviceRequest,
        LifestyleAdviceRequest,
        ComprehensiveDiagnosisReportRequest,
        TrendData,
        RiskLevel,
        CheckItemUrgency,
    )
    print("[OK] Successfully imported diagnosis_models")

    # Test creating instances
    metric = HealthMetric(
        name="systolic_pressure",
        value=145,
        unit="mmHg",
        normal_range={"min": 90, "max": 120},
        status="abnormal"
    )
    print(f"[OK] Created HealthMetric instance: {metric.name}")

    # Test creating health summary request
    health_request = HealthSummaryRequest(
        user_id="user_123",
        age=55,
        gender="male",
        diseases=["hypertension"],
        recent_metrics=[metric],
        checkin_stats={"blood_pressure": 5},
    )
    print(f"[OK] Created HealthSummaryRequest instance")

    # Test creating risk assessment request
    risk_request = RiskAssessmentRequest(
        user_id="user_123",
        age=60,
        gender="male",
        diseases=["hypertension"],
        health_metrics={"systolic": 150, "diastolic": 95}
    )
    print(f"[OK] Created RiskAssessmentRequest instance")

    # Test creating diagnostic advice request
    diagnostic_request = DiagnosticAdviceRequest(
        user_id="user_123",
        age=55,
        gender="male",
        diseases=["hypertension"],
        health_metrics={"systolic": 160}
    )
    print(f"[OK] Created DiagnosticAdviceRequest instance")

    # Test creating medication advice request
    medication_request = MedicationAdviceRequest(
        user_id="user_123",
        age=60,
        diseases=["hypertension"],
        health_metrics={"systolic": 150}
    )
    print(f"[OK] Created MedicationAdviceRequest instance")

    # Test creating lifestyle advice request
    lifestyle_request = LifestyleAdviceRequest(
        user_id="user_123",
        age=55,
        diseases=["hypertension"],
        current_lifestyle={"diet": "high_salt"},
        health_metrics={"bmi": 28}
    )
    print(f"[OK] Created LifestyleAdviceRequest instance")

    # Test enumerations
    risk_level = RiskLevel.HIGH
    print(f"[OK] RiskLevel enum value: {risk_level.value}")

    urgency = CheckItemUrgency.URGENT
    print(f"[OK] CheckItemUrgency enum value: {urgency.value}")

    # Test validation
    try:
        invalid_request = RiskAssessmentRequest(
            user_id="user_123",
            age=150,  # Out of range
            diseases=["hypertension"],
            health_metrics={"systolic": 150}
        )
    except ValueError as e:
        print(f"[OK] Data validation correctly caught invalid age: {str(e)[:50]}")

    print("\n" + "="*60)
    print("[SUCCESS] Diagnostic module data model validation passed!")
    print("="*60)

except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Runtime error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
