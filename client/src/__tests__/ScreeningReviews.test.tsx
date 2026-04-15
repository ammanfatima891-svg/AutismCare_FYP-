import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScreeningReviews } from '../components/clinician/ScreeningReviews';
import { clinicianAPI, screeningAPI } from '../api';

vi.mock('../api', () => ({
  clinicianAPI: {
    getScreeningReviews: vi.fn(),
  },
  screeningAPI: {
    getSubmissionById: vi.fn(),
  },
}));

const mockedClinicianAPI = vi.mocked(clinicianAPI);
const mockedScreeningAPI = vi.mocked(screeningAPI);

describe('ScreeningReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads screenings, opens detail, and shows questionnaire responses', async () => {
    const user = userEvent.setup();

    mockedClinicianAPI.getScreeningReviews.mockResolvedValue({
      data: {
        data: [
          {
            id: 'sub-1',
            parent: { id: 'p-1', name: 'Parent One', email: 'parent@example.com' },
            child: { id: 'c-1', name: 'Ayaan Ahmed', ageYears: 4 },
            questionnaireType: 'MCHAT-R',
            score: 9,
            result: 'At risk',
            riskLevel: 'high',
            status: 'SUBMITTED',
            createdAt: '2026-04-11T09:00:00.000Z',
          },
        ],
      },
    });

    mockedScreeningAPI.getSubmissionById.mockResolvedValue({
      data: {
        data: {
          questionnaireType: 'MCHAT-R',
          createdAt: '2026-04-11T09:00:00.000Z',
          scores: { totalScore: 9 },
          responses: [{ questionId: 'q1', answer: 'yes' }],
        },
      },
    });

    render(<ScreeningReviews />);

    await screen.findByText('Ayaan Ahmed');

    await user.click(screen.getByRole('button', { name: /view details/i }));
    await screen.findByText('Questionnaire Responses');

    expect(mockedScreeningAPI.getSubmissionById).toHaveBeenCalledWith('sub-1');
    expect(screen.getByText(/answer:/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Questionnaire Responses')).not.toBeInTheDocument();
  });
});
