import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClinicalEvaluationTab } from '../components/evaluation/ClinicalEvaluationTab';
import { evaluationAPI } from '../services/api';

// Stub the heavy multi-step form (react-hook-form + async effects) to keep unit tests fast/stable.
vi.mock('@/components/evaluation/EvaluationForm', () => {
  return {
    EvaluationForm: ({ title, initialValue, onSubmit }: any) => {
      const [form, setForm] = React.useState(() => ({
        observations: (initialValue?.observations as string) || '',
        developmentalSummary: (initialValue?.developmentalSummary as string) || '',
        diagnosis: (initialValue?.diagnosis as string) || '',
        comorbidConditions: (initialValue?.comorbidConditions as string[]) || [],
        recommendations: (initialValue?.recommendations as string) || '',
      }));
      return (
        <div>
          <div>Evaluation Detail</div>
          <div>{title}</div>
          <textarea
            placeholder="Clinical observations from interaction and assessment."
            value={form.observations}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setForm((prev: any) => ({ ...prev, observations: v }));
            }}
          />
          <textarea
            placeholder="Diagnostic impression and rationale."
            value={form.diagnosis}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setForm((prev: any) => ({ ...prev, diagnosis: v }));
            }}
          />
          <button
            data-testid="save-draft-button"
            onClick={() =>
              onSubmit(
                {
                  observations: form.observations,
                  developmentalSummary: form.developmentalSummary,
                  diagnosis: form.diagnosis,
                  comorbidConditions: form.comorbidConditions,
                  recommendations: form.recommendations,
                },
                'DRAFT'
              )
            }
          >
            Save Draft
          </button>
          <button
            onClick={() =>
              onSubmit(
                {
                  observations: form.observations || 'x',
                  developmentalSummary: form.developmentalSummary,
                  diagnosis: form.diagnosis,
                  comorbidConditions: form.comorbidConditions,
                  recommendations: form.recommendations,
                },
                'FINALIZED'
              )
            }
          >
            Finalize
          </button>
        </div>
      );
    },
  };
});

vi.mock('../services/api', () => ({
  evaluationAPI: {
    listByCase: vi.fn(),
    create: vi.fn(),
    updateVersion: vi.fn(),
    getDevelopmentSummary: vi.fn(),
  },
  integrationAPI: {
    getCaseSummary: vi.fn(),
  },
  referralAPI: {
    create: vi.fn(),
  },
}));

const mockedEvaluationAPI = vi.mocked(evaluationAPI);

function renderTab(onCreateReferral = vi.fn()) {
  return render(
    <ClinicalEvaluationTab
      caseId="case-123"
      childName="Ayaan"
      onCreateReferral={onCreateReferral}
    />
  );
}

describe('ClinicalEvaluationTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new draft evaluation from the frontend form', async () => {
    const user = userEvent.setup();

    mockedEvaluationAPI.listByCase
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              _id: 'eval-1',
              status: 'DRAFT',
              observations: 'Observed repetitive movement',
              developmentalSummary: '',
              diagnosis: '',
              comorbidConditions: [],
              recommendations: '',
              createdAt: '2026-04-11T08:00:00.000Z',
            },
          ],
        },
      });
    mockedEvaluationAPI.create.mockResolvedValue({ data: {} });

    renderTab();

    await screen.findByText('No evaluations yet. Create the first draft for this case.');

    await user.click(screen.getByRole('button', { name: 'New Evaluation' }));
    await user.type(
      screen.getByPlaceholderText('Clinical observations from interaction and assessment.'),
      'Observed repetitive movement'
    );

    await user.click(screen.getByTestId('save-draft-button'));

    await waitFor(() => {
      expect(mockedEvaluationAPI.create).toHaveBeenCalledWith({
        caseId: 'case-123',
        observations: 'Observed repetitive movement',
        developmentalSummary: '',
        diagnosis: '',
        comorbidConditions: [],
        recommendations: '',
        status: 'DRAFT',
      });
    });

    expect(await screen.findByText('Evaluation Detail')).toBeInTheDocument();
  });

  it('enables referral action once a final evaluation exists', async () => {
    const user = userEvent.setup();
    const onCreateReferral = vi.fn();

    mockedEvaluationAPI.listByCase.mockResolvedValue({
      data: {
        data: [
          {
            _id: 'eval-final',
            status: 'FINALIZED',
            observations: 'Final observation',
            developmentalSummary: '',
            diagnosis: 'ASD likely',
            comorbidConditions: [],
            recommendations: 'Start therapy',
            createdAt: '2026-04-11T10:00:00.000Z',
          },
        ],
      },
    });

    renderTab(onCreateReferral);

    const createReferralButton = await screen.findByRole('button', { name: 'Create Referral' });
    expect(createReferralButton).toBeEnabled();
    expect(screen.queryByText('Referral is disabled until at least one evaluation is finalized.')).not.toBeInTheDocument();

    await user.click(createReferralButton);
    expect(onCreateReferral).toHaveBeenCalledTimes(1);
  });

  it('creates a new version when editing an existing evaluation', async () => {
    const user = userEvent.setup();

    mockedEvaluationAPI.listByCase
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              _id: 'eval-7',
              status: 'FINALIZED',
              observations: 'Original observations',
              developmentalSummary: 'Summary v1',
              diagnosis: 'Diagnosis v1',
              comorbidConditions: ['ADHD'],
              recommendations: 'Recommendation v1',
              createdAt: '2026-04-11T11:00:00.000Z',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              _id: 'eval-8',
              status: 'DRAFT',
              observations: 'Original observations',
              developmentalSummary: 'Summary v1',
              diagnosis: 'Diagnosis v2',
              comorbidConditions: ['ADHD'],
              recommendations: 'Recommendation v1',
              createdAt: '2026-04-11T11:10:00.000Z',
            },
            {
              _id: 'eval-7',
              status: 'FINALIZED',
              observations: 'Original observations',
              developmentalSummary: 'Summary v1',
              diagnosis: 'Diagnosis v1',
              comorbidConditions: ['ADHD'],
              recommendations: 'Recommendation v1',
              createdAt: '2026-04-11T11:00:00.000Z',
            },
          ],
        },
      });
    mockedEvaluationAPI.updateVersion.mockResolvedValue({ data: {} });

    renderTab();

    await screen.findByText('Evaluation Detail');

    await user.click(screen.getByRole('button', { name: 'Create New Version' }));

    const diagnosisField = screen.getByPlaceholderText('Diagnostic impression and rationale.');
    await user.clear(diagnosisField);
    await user.type(diagnosisField, 'Diagnosis v2');

    await user.click(screen.getByTestId('save-draft-button'));

    await waitFor(() => {
      expect(mockedEvaluationAPI.updateVersion).toHaveBeenCalledWith('eval-7', {
        observations: 'Original observations',
        developmentalSummary: 'Summary v1',
        diagnosis: 'Diagnosis v2',
        comorbidConditions: ['ADHD'],
        recommendations: 'Recommendation v1',
        status: 'DRAFT',
      });
    });

    expect(await screen.findByText('Evaluation Detail')).toBeInTheDocument();
  });
});
