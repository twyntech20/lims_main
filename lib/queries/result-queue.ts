// One select shape for every result queue (admin + analyst, work + review)
// so the four pages can't drift apart on which workflow facts they load.
export const RESULT_QUEUE_SELECT = `
  id,
  status,
  result,
  unit,
  qualifier,
  mdl,
  dilution_factor,
  analyst_notes,
  entered_at,
  reviewed_at,
  returned_at,
  rejection_reason,
  review_round,
  assigned_reviewer_id,
  samples (
    id,
    sample_id,
    description,
    matrix_type,
    collection_date,
    orders (
      id,
      order_number,
      priority,
      date_due,
      customer_name,
      released_at,
      assigned_analyst_id,
      clients ( client_name )
    )
  ),
  tests (
    id,
    name,
    code,
    category,
    unit,
    method,
    mdl,
    matrix,
    unit_options
  ),
  entered_by_profile:profiles!sample_tests_entered_by_fkey ( id, first_name, last_name, email ),
  reviewed_by_profile:profiles!sample_tests_reviewed_by_fkey ( id, first_name, last_name, email ),
  assigned_reviewer_profile:profiles!sample_tests_assigned_reviewer_id_fkey ( id, first_name, last_name, email ),
  returned_by_profile:profiles!sample_tests_returned_by_fkey ( id, first_name, last_name, email )
`

// The reviewer pool, matching the authorization check in submitSampleForReview.
export const REVIEWER_SELECT = 'id, first_name, last_name, email'
