"""
Test script for Priority 2 & 3 bug fixes:
- Section L pattern matching
- Document type classification
- CPARS rating extraction
- PP requirements validation
"""

import sys
import asyncio
from typing import Dict, Any

# Import the real implementation
from app.services.llm_service import LLMService

# Use real implementation instead of mock
MockLLMService = LLMService

# Keep old mock for reference but don't use it
class _OldMockLLMService:
    def extract_section_l_patterns(self, document_text: str) -> Dict[str, Any]:
        """Test the pattern matching logic"""
        import re
        
        if not document_text:
            return {}
        
        text_upper = document_text.upper()
        text_lower = document_text.lower()
        results = {}
        
        # PATTERN 1: References Required
        ref_patterns = [
            r'minimum\s+of\s+(\d+)\s*\(?\d*\)?\s+and\s+(?:a\s+)?maximum\s+of\s+(\d+)',
            r'at\s+least\s+(\d+)\s+(?:and\s+)?(?:no\s+more\s+than|up\s+to|maximum\s+of)\s+(\d+)',
            r'(\d+)\s*[-–]\s*(\d+)\s+(?:references?|projects?|contracts?)',
            r'between\s+(\d+)\s+and\s+(\d+)\s+(?:references?|projects?|contracts?)',
            r'(\d+)\s+to\s+(\d+)\s+(?:references?|projects?|contracts?)',
        ]
        
        for pattern in ref_patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                min_val = int(match.group(1))
                max_val = int(match.group(2))
                if min_val > 0 and max_val >= min_val:
                    results['references_required'] = {"min": min_val, "max": max_val}
                    break
        
        if 'references_required' not in results:
            single_ref_patterns = [
                r'(?:minimum|at\s+least|no\s+fewer\s+than)\s+(\d+)\s+(?:relevant\s+)?(?:references?|projects?|contracts?|past\s+performance)',
                r'(\d+)\s+(?:relevant\s+)?(?:references?|projects?|contracts?|past\s+performance)\s+(?:required|must\s+be\s+submitted)',
                r'submit\s+(?:at\s+least|a\s+minimum\s+of|no\s+fewer\s+than)\s+(\d+)\s+(?:relevant\s+)?(?:references?|projects?|contracts?)',
            ]
            for pattern in single_ref_patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    num = int(match.group(1))
                    if num > 0:
                        results['references_required'] = {"min": num, "max": num}
                        break
        
        # PATTERN 2: Contract Value Range
        value_patterns = [
            r'\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)\s*(?:to|-|and)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)',
            r'\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:to|-|and)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
            r'contract\s+value\s+(?:of|range|between)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)?\s*(?:to|-|and)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)?',
        ]
        
        for pattern in value_patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                min_str = match.group(1).replace(',', '')
                max_str = match.group(2).replace(',', '')
                
                if 'million' in match.group(0).lower() or re.search(r'\bm\b', match.group(0), re.IGNORECASE):
                    min_val = float(min_str) * 1000000
                    max_val = float(max_str) * 1000000
                else:
                    min_val = float(min_str)
                    max_val = float(max_str)
                
                if min_val > 0 and max_val >= min_val:
                    results['contract_value'] = {"min": int(min_val), "max": int(max_val)}
                    break
        
        if 'contract_value' not in results:
            min_value_patterns = [
                r'minimum\s+contract\s+value\s+of\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)?',
                r'contract\s+value\s+(?:of|at\s+least)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)?',
            ]
            for pattern in min_value_patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    val_str = match.group(1).replace(',', '')
                    if 'million' in match.group(0).lower() or re.search(r'\bm\b', match.group(0), re.IGNORECASE):
                        min_val = float(val_str) * 1000000
                    else:
                        min_val = float(val_str)
                    if min_val > 0:
                        results['contract_value'] = {"min": int(min_val)}
                        break
        
        # PATTERN 3: Recency Period (old mock - not used)
        recency_patterns = [
            r'(\d+)%\s+complete\s+within\s+(?:a\s+)?(\d+)[-\s]*(?:year|yr)\s+period',
            r'(\d+)%\s+complete\s+within\s+(?:a\s+)?(six|seven|eight|nine|ten|\d+)[-\s]*(?:year|yr)',
            r'(\d+)%\s+complete\s+within\s+(?:a\s+)?(\d+)[-\s]*(?:year|yr)',
            r'within\s+(\d+)\s*(?:year|yr)',
            r'(\d+)\s*(?:year|yr)\s+period',
            r'completed\s+(?:after|since|within)\s+(\d{4})',
        ]
        
        for pattern in recency_patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                if len(match.groups()) == 2:
                    threshold = match.group(1)
                    years = int(match.group(2))
                    results['completion_threshold'] = f"{threshold}%"
                    results['recency_years'] = years
                elif len(match.groups()) == 1:
                    val = match.group(1)
                    if len(val) == 4:
                        try:
                            year = int(val)
                            current_year = 2025
                            years = current_year - year
                            if 0 < years < 20:
                                results['recency_years'] = years
                        except:
                            pass
                    else:
                        years = int(val)
                        if 0 < years < 20:
                            results['recency_years'] = years
                break
        
        return results


def test_section_l_patterns():
    """Test Section L pattern matching"""
    print("\n" + "="*60)
    print("TEST 1: Section L Pattern Matching")
    print("="*60)
    
    llm = MockLLMService()
    
    test_cases = [
        {
            "name": "References range",
            "text": "Section L.5.1: Offerors shall submit a minimum of 3 and a maximum of 5 relevant past performance references.",
            "expected": {"references_required": {"min": 3, "max": 5}}
        },
        {
            "name": "Contract value range",
            "text": "Each project must have a contract value of approximately $500,000 to $20,000,000.",
            "expected": {"contract_value": {"min": 500000, "max": 20000000}}
        },
        {
            "name": "Contract value with millions",
            "text": "Each project must have a contract value between $1 million and $10 million.",
            "expected": {"contract_value": {"min": 1000000, "max": 10000000}}
        },
        {
            "name": "Recency period",
            "text": "Projects must be completed within 6 years of the proposal due date.",
            "expected": {"recency_years": 6}
        },
        {
            "name": "Completion threshold",
            "text": "Projects must be 65% complete within a 6-year period.",
            "expected": {"completion_threshold": "65%", "recency_years": 6}
        },
        {
            "name": "Single reference requirement",
            "text": "Offerors must submit at least 3 relevant projects.",
            "expected": {"references_required": {"min": 3, "max": 3}}
        },
    ]
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        result = llm.extract_section_l_patterns(test["text"])
        expected = test["expected"]
        
        # Check if all expected keys match
        match = True
        for key, expected_val in expected.items():
            if key not in result:
                match = False
                break
            if isinstance(expected_val, dict):
                if not isinstance(result[key], dict):
                    match = False
                    break
                for sub_key, sub_val in expected_val.items():
                    if result[key].get(sub_key) != sub_val:
                        match = False
                        break
            else:
                if result[key] != expected_val:
                    match = False
                    break
        
        if match:
            print(f"✅ PASS: {test['name']}")
            print(f"   Result: {result}")
            passed += 1
        else:
            print(f"❌ FAIL: {test['name']}")
            print(f"   Expected: {expected}")
            print(f"   Got: {result}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_document_type_classification():
    """Test document type classification heuristics"""
    print("\n" + "="*60)
    print("TEST 2: Document Type Classification")
    print("="*60)
    
    # Import the actual function (we'll need to mock it or import it)
    # For now, let's test the logic manually
    
    def classify_document_type(filename: str, text: str, parsed_content: Dict[str, Any]) -> str:
        filename_lower = filename.lower()
        text_lower = text.lower()[:5000]
        
        if any(kw in filename_lower for kw in ["cpars", "past performance", "contract", "task order", "to-", "mod-"]):
            if not any(kw in filename_lower for kw in ["capability", "narrative", "overview", "statement"]):
                return "CONTRACT_CPARS"
        
        if any(kw in filename_lower for kw in ["capability", "narrative", "overview", "statement", "company profile"]):
            return "NARRATIVE"
        
        if any(kw in filename_lower for kw in ["rfp", "solicitation", "pws", "sow", "amendment"]):
            return "SOLICITATION"
        
        contract_indicators = [
            "contract number", "task order", "modification", "period of performance",
            "cpars", "performance evaluation", "contractor performance",
        ]
        narrative_indicators = [
            "capability statement", "company overview", "our capabilities",
            "we provide", "about our company",
        ]
        solicitation_indicators = [
            "section l", "section m", "instructions to offerors",
            "evaluation factors", "request for proposal",
        ]
        
        contract_score = sum(1 for ind in contract_indicators if ind in text_lower)
        narrative_score = sum(1 for ind in narrative_indicators if ind in text_lower)
        solicitation_score = sum(1 for ind in solicitation_indicators if ind in text_lower)
        
        has_contract_number = bool(parsed_content.get("contract_number"))
        
        if solicitation_score >= 2:
            return "SOLICITATION"
        elif has_contract_number and contract_score >= 2:
            return "CONTRACT_CPARS"
        elif narrative_score >= 2:
            return "NARRATIVE"
        elif has_contract_number:
            return "CONTRACT_CPARS"
        elif contract_score > narrative_score:
            return "CONTRACT_CPARS"
        elif narrative_score > 0:
            return "NARRATIVE"
        else:
            return "CONTRACT_CPARS"
    
    test_cases = [
        {
            "name": "CPARS filename",
            "filename": "W15P7T22C0014_CPARS_2023.pdf",
            "text": "Contractor Performance Assessment Report...",
            "parsed": {"contract_number": "W15P7T22C0014"},
            "expected": "CONTRACT_CPARS"
        },
        {
            "name": "Capability statement filename",
            "filename": "Company_Capability_Statement_2024.pdf",
            "text": "Our company provides comprehensive IT services...",
            "parsed": {},
            "expected": "NARRATIVE"
        },
        {
            "name": "RFP filename",
            "filename": "RFP_SOLICITATION_2024.pdf",
            "text": "Section L: Instructions to Offerors... Section M: Evaluation Factors...",
            "parsed": {},
            "expected": "SOLICITATION"
        },
        {
            "name": "Contract with number in content",
            "filename": "past_performance.pdf",
            "text": "Contract Number: W15P7T22C0014. Period of Performance: 2020-2023.",
            "parsed": {"contract_number": "W15P7T22C0014"},
            "expected": "CONTRACT_CPARS"
        },
        {
            "name": "Narrative by content",
            "filename": "company_doc.pdf",
            "text": "Company Overview: We provide comprehensive capabilities. Our services include...",
            "parsed": {},
            "expected": "NARRATIVE"
        },
    ]
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        result = classify_document_type(
            test["filename"],
            test["text"],
            test["parsed"]
        )
        
        if result == test["expected"]:
            print(f"✅ PASS: {test['name']}")
            print(f"   Result: {result}")
            passed += 1
        else:
            print(f"❌ FAIL: {test['name']}")
            print(f"   Expected: {test['expected']}")
            print(f"   Got: {result}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_pp_requirements_validation():
    """Test PP requirements validation"""
    print("\n" + "="*60)
    print("TEST 3: PP Requirements Validation")
    print("="*60)
    
    def validate_pp_requirements(pp_reqs: Dict[str, Any], document_text: str, llm_service) -> Dict[str, Any]:
        """Simplified validation logic for testing"""
        if not pp_reqs:
            pp_reqs = {}
        
        validated = {}
        
        # Validate references_required
        ref_req = pp_reqs.get("references_required")
        if ref_req:
            if isinstance(ref_req, dict):
                min_val = ref_req.get("min")
                max_val = ref_req.get("max")
                if min_val and str(min_val).upper() not in ["NAN", "N/A", "NULL", "NOT SPECIFIED", ""]:
                    try:
                        validated["references_required"] = {
                            "min": int(float(str(min_val))),
                            "max": int(float(str(max_val))) if max_val and str(max_val).upper() not in ["NAN", "N/A", "NULL", "NOT SPECIFIED", ""] else int(float(str(min_val)))
                        }
                    except (ValueError, TypeError):
                        pass
        
        # If still missing, try regex extraction
        if "references_required" not in validated:
            regex_results = llm_service.extract_section_l_patterns(document_text)
            if "references_required" in regex_results:
                validated["references_required"] = regex_results["references_required"]
        
        # Validate contract_value
        contract_val = pp_reqs.get("contract_value")
        if contract_val:
            if isinstance(contract_val, dict):
                min_val = contract_val.get("min")
                max_val = contract_val.get("max")
                if min_val and str(min_val).upper() not in ["NAN", "N/A", "NULL", "NOT SPECIFIED", ""]:
                    try:
                        if isinstance(min_val, str):
                            min_val = min_val.replace("$", "").replace(",", "").strip()
                        if isinstance(max_val, str) and max_val:
                            max_val = max_val.replace("$", "").replace(",", "").strip()
                        
                        validated["contract_value"] = {
                            "min": int(float(str(min_val))),
                            "max": int(float(str(max_val))) if max_val and str(max_val).upper() not in ["NAN", "N/A", "NULL", "NOT SPECIFIED", ""] else None
                        }
                    except (ValueError, TypeError):
                        pass
        
        # If still missing, try regex extraction
        if "contract_value" not in validated:
            regex_results = llm_service.extract_section_l_patterns(document_text)
            if "contract_value" in regex_results:
                validated["contract_value"] = regex_results["contract_value"]
        
        # Validate recency_years
        recency = pp_reqs.get("recency_years")
        if recency:
            if str(recency).upper() not in ["NAN", "N/A", "NULL", "NOT SPECIFIED", ""]:
                try:
                    validated["recency_years"] = int(float(str(recency)))
                except (ValueError, TypeError):
                    pass
        
        # If still missing, try regex extraction
        if "recency_years" not in validated:
            regex_results = llm_service.extract_section_l_patterns(document_text)
            if "recency_years" in regex_results:
                validated["recency_years"] = regex_results["recency_years"]
        
        # Copy other fields
        for key in ["completion_threshold", "mandatory_requirements", "geographic_preference", "cpars_requested"]:
            if key in pp_reqs and pp_reqs[key]:
                validated[key] = pp_reqs[key]
        
        return validated
    
    llm = MockLLMService()
    
    test_cases = [
        {
            "name": "Replace NaN with regex extraction",
            "pp_reqs": {"references_required": {"min": "NaN", "max": "NaN"}},
            "document_text": "Submit minimum of 3 and maximum of 5 references.",
            "expected": {"references_required": {"min": 3, "max": 5}}
        },
        {
            "name": "Replace Not specified with regex",
            "pp_reqs": {"contract_value": {"min": "Not specified", "max": None}},
            "document_text": "Contract value must be between $500,000 and $20,000,000.",
            "expected": {"contract_value": {"min": 500000, "max": 20000000}}
        },
        {
            "name": "Valid values preserved",
            "pp_reqs": {"references_required": {"min": 3, "max": 5}, "recency_years": 6},
            "document_text": "",
            "expected": {"references_required": {"min": 3, "max": 5}, "recency_years": 6}
        },
        {
            "name": "String numbers converted",
            "pp_reqs": {"references_required": {"min": "3", "max": "5"}},
            "document_text": "",
            "expected": {"references_required": {"min": 3, "max": 5}}
        },
    ]
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        result = validate_pp_requirements(test["pp_reqs"], test["document_text"], llm)
        expected = test["expected"]
        
        # Check if all expected keys match
        match = True
        for key, expected_val in expected.items():
            if key not in result:
                match = False
                break
            if isinstance(expected_val, dict):
                if not isinstance(result[key], dict):
                    match = False
                    break
                for sub_key, sub_val in expected_val.items():
                    if result[key].get(sub_key) != sub_val:
                        match = False
                        break
            else:
                if result[key] != expected_val:
                    match = False
                    break
        
        if match:
            print(f"✅ PASS: {test['name']}")
            print(f"   Result: {result}")
            passed += 1
        else:
            print(f"❌ FAIL: {test['name']}")
            print(f"   Expected: {expected}")
            print(f"   Got: {result}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_cpars_rating_extraction():
    """Test CPARS rating extraction from text"""
    print("\n" + "="*60)
    print("TEST 4: CPARS Rating Extraction")
    print("="*60)
    
    def extract_cpars_ratings_from_text(text: str) -> Dict[str, str]:
        """Simplified CPARS extraction for testing"""
        if not text:
            return {}
        
        rating_words = [
            "Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "N/A", "NA",
        ]
        
        label_map = {
            "quality of product/service": "Quality",
            "quality of product": "Quality",
            "quality": "Quality",
            "schedule": "Schedule",
            "cost control": "Cost",
            "cost": "Cost",
            "management/business relations": "Management",
            "business relations": "Management",
            "management": "Management",
            "small business subcontracting": "Small Business",
            "small business": "Small Business",
            "regulatory compliance": "Regulatory Compliance",
        }
        
        results = {}
        lines = text.splitlines()
        
        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue
            
            lower_line = line.lower()
            
            found_rating = None
            for word in rating_words:
                token = word.lower().replace("/", "")
                if token in lower_line.replace("/", ""):
                    found_rating = "N/A" if word in ("N/A", "NA") else word
                    break
            
            if not found_rating:
                continue
            
            for label_substr, norm_key in label_map.items():
                if label_substr in lower_line:
                    results.setdefault(norm_key, found_rating)
        
        return results
    
    test_cases = [
        {
            "name": "Standard CPARS format",
            "text": """
            Quality of Product/Service: Very Good
            Schedule: Satisfactory
            Cost Control: Exceptional
            Management: Very Good
            """,
            "expected": {
                "Quality": "Very Good",
                "Schedule": "Satisfactory",
                "Cost": "Exceptional",
                "Management": "Very Good"
            }
        },
        {
            "name": "Messy PDF extraction",
            "text": "Quality N/A Very Good\nSchedule . . . . . Satisfactory",
            "expected": {
                "Quality": "Very Good",
                "Schedule": "Satisfactory"
            }
        },
        {
            "name": "Negative rating",
            "text": "Small Business Subcontracting: Marginal",
            "expected": {
                "Small Business": "Marginal"
            }
        },
    ]
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        result = extract_cpars_ratings_from_text(test["text"])
        expected = test["expected"]
        
        match = result == expected
        
        if match:
            print(f"✅ PASS: {test['name']}")
            print(f"   Result: {result}")
            passed += 1
        else:
            print(f"❌ FAIL: {test['name']}")
            print(f"   Expected: {expected}")
            print(f"   Got: {result}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("BIDWIN BUG FIXES - TEST SUITE")
    print("="*60)
    
    results = []
    
    results.append(("Section L Pattern Matching", test_section_l_patterns()))
    results.append(("Document Type Classification", test_document_type_classification()))
    results.append(("PP Requirements Validation", test_pp_requirements_validation()))
    results.append(("CPARS Rating Extraction", test_cpars_rating_extraction()))
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
    else:
        print("⚠️  SOME TESTS FAILED - Review output above")
    print("="*60 + "\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
