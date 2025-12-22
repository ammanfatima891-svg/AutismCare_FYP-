import { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import API from "../api";
import { calculateAgeInMonths, getASQInterval, isEligibleForMCHAT } from "../utils/ageUtils";

export default function ScreeningForm({ selectedChild = null, questionnaireType: initialQuestionnaireType = null, onComplete = null }) {
  const [questionnaireType, setQuestionnaireType] = useState(initialQuestionnaireType || "ASQ-3");
  const [questions, setQuestions] = useState([]);
  const [availableQuestionnaires, setAvailableQuestionnaires] = useState([]);
  const [weeksPreterm, setWeeksPreterm] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine available questionnaires based on child's age
  useEffect(() => {
    if (selectedChild) {
      const ageInMonths = calculateAgeInMonths(new Date(selectedChild.dateOfBirth));
      const questionnaires = [];

      // ASQ-3 is available for children 2-66 months
      if (ageInMonths >= 2 && ageInMonths <= 66) {
        questionnaires.push({
          type: 'ASQ-3',
          name: `ASQ-3 (${getASQInterval(ageInMonths)} months)`,
          description: 'Ages & Stages Questionnaires, Third Edition'
        });
      }

      // M-CHAT-R is available for children 16 months and older
      if (isEligibleForMCHAT(new Date(selectedChild.dateOfBirth))) {
        questionnaires.push({
          type: 'MCHAT-R',
          name: 'M-CHAT-R',
          description: 'Modified Checklist for Autism in Toddlers, Revised'
        });
      }

      setAvailableQuestionnaires(questionnaires);

      // Set default questionnaire
      if (questionnaires.length > 0 && !initialQuestionnaireType) {
        setQuestionnaireType(questionnaires[0].type);
      }
    }
  }, [selectedChild, initialQuestionnaireType]);

  // Fetch questions from backend dynamically
  useEffect(() => {
    if (questionnaireType && selectedChild) {
      const fetchQuestions = async () => {
        try {
          const res = await API.get(`/screening/questionnaires/${questionnaireType}?dob=${selectedChild.dateOfBirth}`);
          setQuestions(res.data.data.questions || []);
        } catch (err) {
          console.error('Error fetching questions:', err);
          setQuestions([]);
        }
      };
      fetchQuestions();
    }
  }, [questionnaireType, selectedChild]);

  const handleSubmit = async (values) => {
    if (!selectedChild) {
      alert("No child selected");
      return;
    }

    setIsSubmitting(true);

    const responses = Object.entries(values).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      const res = await API.post("/screening/calculate-screening", {
        childId: selectedChild.id,
        questionnaireType,
        dob: selectedChild.dateOfBirth,
        weeksPreterm: parseInt(weeksPreterm, 10),
        responses,
      });
      setSubmissionResult(res.data);

      if (onComplete) {
        onComplete(res.data);
      }
    } catch (err) {
      console.error('Error submitting screening:', err);
      alert("Failed to submit screening. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4">Screening Form</h2>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Questionnaire Type</label>
        <select
          value={questionnaireType}
          onChange={(e) => setQuestionnaireType(e.target.value)}
          className="border p-2 rounded w-full"
        >
          {availableQuestionnaires.map((q) => (
            <option key={q.type} value={q.type}>
              {q.name} - {q.description}
            </option>
          ))}
        </select>
      </div>

      {selectedChild && (
        <div className="mb-4">
          <label className="block mb-1 font-medium">Selected Child</label>
          <div className="border p-2 rounded w-full bg-gray-50">
            {selectedChild.firstName} {selectedChild.lastName} (DOB: {new Date(selectedChild.dateOfBirth).toLocaleDateString()})
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block mb-1 font-medium">Weeks Preterm</label>
        <input
          type="number"
          value={weeksPreterm}
          onChange={(e) => setWeeksPreterm(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {questions.length > 0 && (
        <Formik
          initialValues={questions.reduce((acc, q) => {
            acc[q.questionId] = "";
            return acc;
          }, {})}
          onSubmit={handleSubmit}
        >
          {() => (
            <Form>
              {questions.map((q) => (
                <div key={q.questionId} className="mb-3">
                  <label className="block font-medium mb-1">{q.text}</label>
                  {questionnaireType === "ASQ-3" ? (
                    <Field
                      as="select"
                      name={q.questionId}
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="sometimes">Sometimes</option>
                      <option value="not_yet">Not yet</option>
                    </Field>
                  ) : (
                    <Field
                      as="select"
                      name={q.questionId}
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Field>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Submit
              </button>
            </Form>
          )}
        </Formik>
      )}

      {submissionResult && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-bold mb-2">Results</h3>
          <p><strong>Result:</strong> {submissionResult.data.result}</p>
          <p><strong>Description:</strong> {submissionResult.resultDescription}</p>

          {submissionResult.data.domainScores && (
            <div className="mt-2">
              <h4 className="font-semibold">Domain Scores:</h4>
              <ul className="list-disc ml-6">
                {Object.entries(submissionResult.data.domainScores).map(([domain, score]) => (
                  <li key={domain}>
                    {domain}: {score} ({submissionResult.data.domainStatuses[domain]})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submissionResult.elevatedItems && submissionResult.elevatedItems.length > 0 && (
            <div className="mt-2">
              <h4 className="font-semibold">Elevated Items:</h4>
              <ul className="list-disc ml-6">
                {submissionResult.elevatedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
