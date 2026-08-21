'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  validateEmail, validateClientPhone, validatePriority,
  validateMatrixType, validateDateOrder,
  assertNoErrors, ValidationError,
} from '@/lib/validation'
import { isQualifiedForOrder, orderLabCategories, labCategoryLabel } from '@/lib/workflow'

export async function createOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId          = (formData.get('client_id')           as string ?? '').trim()
  const priority          = (formData.get('priority')            as string ?? 'normal').trim()
  const status            = (formData.get('status')              as string ?? 'new').trim()
  const customerName      = (formData.get('customer_name')       as string ?? '').trim()
  const customerEmail     = (formData.get('customer_email')      as string ?? '').trim()
  const customerPhone     = (formData.get('customer_phone')      as string ?? '').trim() || null
  const faxNo             = (formData.get('fax_no')             as string ?? '').trim() || null
  const shippingAddress   = (formData.get('shipping_address')    as string ?? '').trim() || null
  const projectName       = (formData.get('project_name')        as string ?? '').trim() || null
  const projectNumber     = (formData.get('project_number')      as string ?? '').trim() || null
  const poNumber          = (formData.get('po_number')           as string ?? '').trim() || null
  const projectManager    = (formData.get('project_manager')     as string ?? '').trim() || null
  const samplerName       = (formData.get('sampler_name')        as string ?? '').trim() || null
  const dateReceived      = (formData.get('date_received')       as string ?? '') || null
  const dateDue           = (formData.get('date_due')            as string ?? '') || null
  const airbillNo         = (formData.get('airbill_no')          as string ?? '').trim() || null
  const coolerNo          = (formData.get('cooler_no')           as string ?? '').trim() || null
  const sampleTemp        = (formData.get('sample_temp')         as string ?? '').trim() || null
  const remarks           = (formData.get('remarks')             as string ?? '').trim() || null
  const relinquishedBy1   = (formData.get('relinquished_by_1')   as string ?? '').trim() || null
  const relinquishedDate1 = (formData.get('relinquished_date_1') as string ?? '').trim() || null
  const relinquishedTime1 = (formData.get('relinquished_time_1') as string ?? '').trim() || null
  const receivedBy1       = (formData.get('received_by_1')       as string ?? '').trim() || null
  const receivedDate1     = (formData.get('received_date_1')     as string ?? '').trim() || null
  const receivedTime1     = (formData.get('received_time_1')     as string ?? '').trim() || null
  const relinquishedBy2   = (formData.get('relinquished_by_2')   as string ?? '').trim() || null
  const relinquishedDate2 = (formData.get('relinquished_date_2') as string ?? '').trim() || null
  const relinquishedTime2 = (formData.get('relinquished_time_2') as string ?? '').trim() || null
  const receivedBy2       = (formData.get('received_by_2')       as string ?? '').trim() || null
  const receivedDate2     = (formData.get('received_date_2')     as string ?? '').trim() || null
  const receivedTime2     = (formData.get('received_time_2')     as string ?? '').trim() || null
  const samplesReturnedStr = (formData.get('samples_returned_to_client') as string ?? '').trim()
  const samplesReturnedToClient = samplesReturnedStr === 'true' ? true : samplesReturnedStr === 'false' ? false : null
  const storageDays       = (formData.get('storage_days')        as string ?? '').trim() || null
  const isComplianceStr   = (formData.get('is_compliance_drinking_water') as string ?? '').trim()
  const isComplianceDrinkingWater = isComplianceStr === 'true' ? true : isComplianceStr === 'false' ? false : null
  const specialInstructions = (formData.get('special_instructions') as string ?? '').trim() || null
  const signPrint         = (formData.get('sign_print')          as string ?? '').trim() || null
  const signDate          = (formData.get('sign_date')           as string ?? '').trim() || null
  const sampleCount       = parseInt((formData.get('sample_count') as string) || '0', 10)

  // Build COC metadata to store in notes field (since orders table has limited columns)
  const cocMeta = {
    project_name: projectName,
    project_number: projectNumber,
    po_number: poNumber,
    project_manager: projectManager,
    sampler_name: samplerName,
    fax_no: faxNo,
    airbill_no: airbillNo,
    cooler_no: coolerNo,
    sample_temp: sampleTemp,
    remarks,
    relinquished_by_1: relinquishedBy1,
    relinquished_date_1: relinquishedDate1,
    relinquished_time_1: relinquishedTime1,
    received_by_1: receivedBy1,
    received_date_1: receivedDate1,
    received_time_1: receivedTime1,
    relinquished_by_2: relinquishedBy2,
    relinquished_date_2: relinquishedDate2,
    relinquished_time_2: relinquishedTime2,
    received_by_2: receivedBy2,
    received_date_2: receivedDate2,
    received_time_2: receivedTime2,
    is_compliance_drinking_water: isComplianceDrinkingWater,
    samples_returned_to_client: samplesReturnedToClient,
    storage_days: storageDays,
    special_instructions: specialInstructions,
    sign_print: signPrint,
    sign_date: signDate,
  }
  const notes = JSON.stringify(cocMeta)

  const VALID_STATUSES = ['new','submitted','in_progress','review','completed','cancelled']

  const errors: ValidationError = {}
  if (!clientId)      errors.client_id     = 'Client is required'
  if (!customerName)  errors.customer_name = 'Customer name is required'
  if (!customerEmail) errors.customer_email = 'Customer email is required'
  else errors.customer_email = validateEmail(customerEmail) ?? ''
  errors.customer_phone = validateClientPhone(customerPhone) ?? ''
  errors.priority       = validatePriority(priority) ?? ''
  errors.date_order     = validateDateOrder(dateReceived, dateDue) ?? ''
  if (!VALID_STATUSES.includes(status)) errors.status = 'Invalid status'
  assertNoErrors(errors)

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      client_id:       clientId,
      priority:        priority as 'normal' | 'same_day' | 'priority_24h' | 'priority_48h',
      status:          status as 'new' | 'submitted' | 'in_progress' | 'review' | 'completed' | 'cancelled',
      customer_name:   customerName,
      customer_email:  customerEmail,
      customer_phone:  customerPhone,
      shipping_address: shippingAddress,
      notes,
      date_received:   dateReceived,
      date_due:        dateDue,
      created_by:      user.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // Insert samples
  for (let i = 0; i < sampleCount; i++) {
    const prefix       = `samples[${i}]`
    const sid          = (formData.get(`${prefix}[sample_id]`)      as string ?? '').trim()
    if (!sid) continue

    const dateSampled  = (formData.get(`${prefix}[date_sampled]`)   as string ?? '').trim() || null
    const timeSampled  = (formData.get(`${prefix}[time_sampled]`)   as string ?? '').trim() || null
    const sampleDesc   = (formData.get(`${prefix}[description]`)    as string ?? '').trim() || null
    const matrixType   = (formData.get(`${prefix}[matrix_type]`)    as string ?? '').trim() || null
    const containerCnt = (formData.get(`${prefix}[container_count]`) as string ?? '').trim() || null
    const containerTyp = (formData.get(`${prefix}[container_type]`) as string ?? '').trim() || null
    const sampleTyp    = (formData.get(`${prefix}[sample_type]`)    as string ?? '').trim() || null
    const sampleCond   = (formData.get(`${prefix}[sample_condition]`) as string ?? '').trim() || null
    const testIds      = formData.getAll(`${prefix}[test_ids]`)     as string[]

    // Build collection_date from date + time
    let collectionDate: string | null = null
    if (dateSampled) {
      collectionDate = timeSampled ? `${dateSampled}T${timeSampled}:00` : dateSampled
    }

    // Store extra COC fields in collection_location (JSON)
    const extraMeta = JSON.stringify({
      time_sampled:    timeSampled,
      container_count: containerCnt,
      container_type:  containerTyp,
      sample_type:     sampleTyp,
      sample_condition: sampleCond,
    })

    const { data: sample, error: sErr } = await supabase
      .from('samples')
      .insert({
        order_id:           order.id,
        sample_id:          sid,
        description:        sampleDesc,
        matrix_type:        matrixType,
        collection_date:    collectionDate,
        collection_location: extraMeta,
        status:             'pending',
      })
      .select('id')
      .single()

    if (sErr || !sample) continue

    if (testIds.length > 0) {
      await supabase
        .from('sample_tests')
        .insert(testIds.map((tid) => ({ sample_id: sample.id, test_id: tid })))
    }
  }

  revalidatePath('/admin/orders')
  redirect(`/admin/orders/${order.id}`)
}

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const VALID_STATUSES = ['new','submitted','in_progress','review','completed','cancelled']
  if (!VALID_STATUSES.includes(status)) throw new Error('Invalid order status')

  const updates: Record<string, unknown> = { status }
  if (status === 'completed')  updates.date_completed = new Date().toISOString()
  if (status === 'in_progress') updates.date_assigned = new Date().toISOString()

  const { error } = await supabase.from('orders').update(updates).eq('id', orderId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
}

export async function assignAnalyst(orderId: string, analystId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* An order is worked as one unit, so whoever holds it must cover every
     department it contains. Checked here and not only in the picker: the
     picker can be bypassed by calling this action directly. Clearing the
     assignment has no analyst to qualify, so it skips the check. */
  if (analystId) {
    const [{ data: analyst, error: analystError }, { data: sampleRows, error: testsError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('role, specialty_chemistry, specialty_microbiology')
          .eq('id', analystId)
          .single(),
        supabase
          .from('samples')
          .select('sample_tests ( tests ( category ) )')
          .eq('order_id', orderId),
      ])
    if (analystError) throw new Error(analystError.message)
    if (testsError) throw new Error(testsError.message)
    if (!analyst) throw new Error('That user no longer exists')

    const categories = (sampleRows ?? []).flatMap((sample: any) =>
      (sample.sample_tests ?? []).map((st: any) => st.tests?.category as string | null),
    )

    if (!isQualifiedForOrder(analyst, categories)) {
      const required = orderLabCategories(categories).map(labCategoryLabel).join(' and ')
      throw new Error(
        `That analyst is not qualified for this order — it covers ${required} work, ` +
        'which is outside their assigned specialty',
      )
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({
      assigned_analyst_id: analystId || null,
      status: analystId ? 'in_progress' : 'submitted',
      date_assigned: analystId ? new Date().toISOString() : null,
    })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/orders/${orderId}`)
}

export async function submitToClient(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, assigned_analyst_id, released_at, date_completed')
    .eq('id', orderId)
    .single()
  if (!order) throw new Error('Order not found')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isOwner = order.assigned_analyst_id === user.id
  const isStaffAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  if (!isOwner && !isStaffAdmin) {
    throw new Error('Only the assigned analyst (or an admin) can submit this order to the client')
  }

  // Release is what `released_at` records, and nothing else. Completion is a
  // separate fact: check_order_completion moves an order to 'completed' on its
  // own once every sample finishes, without releasing anything. Treating that
  // as "already released" left trigger-completed orders permanently unable to
  // go out — approved, complete, and refused by this guard.
  if (order.released_at) {
    throw new Error('This order has already been released to the client')
  }

  // Every result must be reviewed and approved before it can go out —
  // this is the "Ready for Client" gate, computed rather than stored.
  const { data: sampleTests } = await supabase
    .from('sample_tests')
    .select('id, status, samples!inner(order_id)')
    .eq('samples.order_id', orderId)

  if (!sampleTests || sampleTests.length === 0) throw new Error('This order has no tests to submit')
  const notApproved = sampleTests.filter((st) => st.status !== 'approved')
  if (notApproved.length > 0) {
    throw new Error(`${notApproved.length} result(s) are not yet approved — cannot submit to client`)
  }

  // An open amendment means someone has flagged a result as wrong. Nothing
  // goes to a client while that question is unresolved.
  const { data: openAmendments } = await supabase
    .from('amendments')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'pending')

  if (openAmendments?.length) {
    throw new Error(`${openAmendments.length} amendment request(s) are still pending on this order — resolve them before releasing`)
  }

  const releasedAt = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update({
      status:         'completed',
      date_completed: order.date_completed ?? releasedAt,
      released_by:    user.id,      // who authorised the release
      released_at:    releasedAt,   // and when
    })
    .eq('id', orderId)
  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'submitted_to_client',
    table_name: 'orders',
    record_id: orderId,
    new_values: {
      order_number: order.order_number,
      status: 'completed',
      released_at: releasedAt,
      results_released: sampleTests.length,
    },
  })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/analyst/orders/${orderId}`)
  revalidatePath('/admin/reports')
  revalidatePath('/admin/dashboard')
  revalidatePath('/analyst/dashboard')
}

export async function addSampleToOrder(formData: FormData) {
  const supabase    = await createClient()
  const orderId     = (formData.get('order_id')            as string ?? '').trim()
  const sampleId    = (formData.get('sample_id')           as string ?? '').trim()
  const description = (formData.get('description')         as string ?? '').trim() || null
  const matrixType  = (formData.get('matrix_type')         as string ?? '').trim() || null
  const collectionDate = (formData.get('collection_date')  as string ?? '') || null
  const collectionLocation = (formData.get('collection_location') as string ?? '').trim() || null
  const testIds     = formData.getAll('test_ids') as string[]

  // Validate
  const errors: ValidationError = {}
  if (!sampleId)          errors.sample_id  = 'Sample ID is required'
  if (sampleId.length < 1 || sampleId.length > 50) errors.sample_id = 'Sample ID must be 1–50 characters'
  errors.matrix_type = validateMatrixType(matrixType) ?? ''
  if (testIds.length === 0) errors.tests = 'At least one test must be selected'
  assertNoErrors(errors)

  // Duplicate sample_id within this order
  const { data: existing } = await supabase
    .from('samples').select('id').eq('order_id', orderId).eq('sample_id', sampleId).maybeSingle()
  if (existing) throw new Error(`Sample ID "${sampleId}" already exists in this order`)

  const { data: sample, error } = await supabase
    .from('samples')
    .insert({ order_id: orderId, sample_id: sampleId, description, matrix_type: matrixType, collection_date: collectionDate, collection_location: collectionLocation, status: 'pending' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const { error: testError } = await supabase
    .from('sample_tests')
    .insert(testIds.map(testId => ({ sample_id: sample.id, test_id: testId })))
  if (testError) throw new Error(testError.message)

  revalidatePath(`/admin/orders/${orderId}`)
}

export async function updateOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id              = (formData.get('id')               as string ?? '').trim()
  const clientId        = (formData.get('client_id')        as string ?? '').trim() || null
  const status          = (formData.get('status')           as string ?? 'new').trim()
  const priority        = (formData.get('priority')         as string ?? 'normal').trim()
  const customerName    = (formData.get('customer_name')    as string ?? '').trim() || null
  const customerEmail   = (formData.get('customer_email')   as string ?? '').trim() || null
  const customerPhone   = (formData.get('customer_phone')   as string ?? '').trim() || null
  const shippingAddress = (formData.get('shipping_address') as string ?? '').trim() || null
  const dateReceived    = (formData.get('date_received')    as string ?? '') || null
  const dateDue         = (formData.get('date_due')         as string ?? '') || null
  const projectName     = (formData.get('project_name')     as string ?? '').trim() || null
  const projectNumber   = (formData.get('project_number')   as string ?? '').trim() || null
  const poNumber        = (formData.get('po_number')        as string ?? '').trim() || null
  const projectManager  = (formData.get('project_manager')  as string ?? '').trim() || null
  const faxNo           = (formData.get('fax_no')           as string ?? '').trim() || null
  const samplerName     = (formData.get('sampler_name')     as string ?? '').trim() || null
  const airbillNo       = (formData.get('airbill_no')       as string ?? '').trim() || null
  const coolerNo        = (formData.get('cooler_no')        as string ?? '').trim() || null
  const sampleTemp      = (formData.get('sample_temp')      as string ?? '').trim() || null
  const remarks         = (formData.get('remarks')          as string ?? '').trim() || null
  const relinquishedBy1   = (formData.get('relinquished_by_1')   as string ?? '').trim() || null
  const relinquishedDate1 = (formData.get('relinquished_date_1') as string ?? '').trim() || null
  const relinquishedTime1 = (formData.get('relinquished_time_1') as string ?? '').trim() || null
  const receivedBy1       = (formData.get('received_by_1')       as string ?? '').trim() || null
  const receivedDate1     = (formData.get('received_date_1')     as string ?? '').trim() || null
  const receivedTime1     = (formData.get('received_time_1')     as string ?? '').trim() || null
  const relinquishedBy2   = (formData.get('relinquished_by_2')   as string ?? '').trim() || null
  const relinquishedDate2 = (formData.get('relinquished_date_2') as string ?? '').trim() || null
  const relinquishedTime2 = (formData.get('relinquished_time_2') as string ?? '').trim() || null
  const receivedBy2       = (formData.get('received_by_2')       as string ?? '').trim() || null
  const receivedDate2     = (formData.get('received_date_2')     as string ?? '').trim() || null
  const receivedTime2     = (formData.get('received_time_2')     as string ?? '').trim() || null
  const isComplianceStr   = (formData.get('is_compliance_drinking_water') as string ?? '').trim()
  const isComplianceDrinkingWater = isComplianceStr === 'true' ? true : isComplianceStr === 'false' ? false : null
  const samplesReturnedStr = (formData.get('samples_returned_to_client') as string ?? '').trim()
  const samplesReturnedToClient = samplesReturnedStr === 'true' ? true : samplesReturnedStr === 'false' ? false : null
  const storageDays       = (formData.get('storage_days')        as string ?? '').trim() || null
  const specialInstructions = (formData.get('special_instructions') as string ?? '').trim() || null
  const signPrint         = (formData.get('sign_print')          as string ?? '').trim() || null
  const signDate          = (formData.get('sign_date')           as string ?? '').trim() || null

  if (!id) throw new Error('Order ID is required')

  const cocMeta = {
    project_name: projectName,
    project_number: projectNumber,
    po_number: poNumber,
    project_manager: projectManager,
    sampler_name: samplerName,
    fax_no: faxNo,
    airbill_no: airbillNo,
    cooler_no: coolerNo,
    sample_temp: sampleTemp,
    remarks,
    relinquished_by_1: relinquishedBy1,
    relinquished_date_1: relinquishedDate1,
    relinquished_time_1: relinquishedTime1,
    received_by_1: receivedBy1,
    received_date_1: receivedDate1,
    received_time_1: receivedTime1,
    relinquished_by_2: relinquishedBy2,
    relinquished_date_2: relinquishedDate2,
    relinquished_time_2: relinquishedTime2,
    received_by_2: receivedBy2,
    received_date_2: receivedDate2,
    received_time_2: receivedTime2,
    is_compliance_drinking_water: isComplianceDrinkingWater,
    samples_returned_to_client: samplesReturnedToClient,
    storage_days: storageDays,
    special_instructions: specialInstructions,
    sign_print: signPrint,
    sign_date: signDate,
  }
  const notes = JSON.stringify(cocMeta)

  const { error } = await supabase
    .from('orders')
    .update({
      client_id:       clientId,
      status:          status as 'new' | 'submitted' | 'in_progress' | 'review' | 'completed' | 'cancelled',
      priority:        priority as 'normal' | 'same_day' | 'priority_24h' | 'priority_48h',
      customer_name:   customerName,
      customer_email:  customerEmail,
      customer_phone:  customerPhone,
      shipping_address: shippingAddress,
      date_received:   dateReceived,
      date_due:        dateDue,
      notes,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/orders/${id}`)
  revalidatePath('/admin/orders')
  redirect(`/admin/orders/${id}`)
}

export async function clientSubmitOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const priority    = (formData.get('priority') as string ?? '').trim() || 'normal'
  const notes       = (formData.get('notes')    as string ?? '').trim() || null
  const sampleCount = parseInt(formData.get('sample_count') as string || '0')

  const errors: ValidationError = {}
  errors.priority = validatePriority(priority) ?? ''
  if (sampleCount === 0) errors.samples = 'At least one sample is required'
  if (notes && notes.length > 2000) errors.notes = 'Notes must be under 2000 characters'
  assertNoErrors(errors)

  // Validate each sample
  for (let i = 0; i < sampleCount; i++) {
    const sid     = (formData.get(`samples[${i}][sample_id]`) as string ?? '').trim()
    const testIds = formData.getAll(`samples[${i}][test_ids]`) as string[]
    const matrix  = formData.get(`samples[${i}][matrix_type]`) as string ?? ''
    if (!sid) throw new Error(`Sample ${i + 1}: Sample ID is required`)
    if (testIds.length === 0) throw new Error(`Sample ${i + 1} (${sid}): at least one test must be selected`)
    const matErr = validateMatrixType(matrix)
    if (matErr) throw new Error(`Sample ${i + 1} (${sid}): ${matErr}`)
  }

  // Get client linked to this portal user (via company_name match)
  const { data: profile } = await supabase.from('profiles').select('company_name').eq('id', user.id).single()
  if (!profile?.company_name) throw new Error('No company associated with your account. Contact the lab.')

  const { data: client } = await supabase
    .from('clients').select('id').ilike('client_name', profile.company_name).single()
  if (!client) throw new Error('Client record not found. Contact the lab.')

  const projectId = (formData.get('project_id') as string ?? '') || null

  const { data: order, error } = await supabase
    .from('orders')
    .insert({ client_id: client.id, project_id: projectId, priority, notes, status: 'submitted', date_received: new Date().toISOString(), created_by: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  for (let i = 0; i < sampleCount; i++) {
    const sid = formData.get(`samples[${i}][sample_id]`) as string
    if (!sid) continue

    const { data: sample, error: sErr } = await supabase
      .from('samples')
      .insert({
        order_id:            order.id,
        sample_id:           sid,
        description:         formData.get(`samples[${i}][description]`) as string || null,
        matrix_type:         formData.get(`samples[${i}][matrix_type]`) as string || null,
        collection_date:     formData.get(`samples[${i}][collection_date]`) as string || null,
        collection_location: formData.get(`samples[${i}][collection_location]`) as string || null,
        status:              'pending',
      })
      .select('id')
      .single()

    if (sErr || !sample) continue

    const testIds = formData.getAll(`samples[${i}][test_ids]`) as string[]
    if (testIds.length > 0) {
      await supabase.from('sample_tests').insert(testIds.map(tid => ({ sample_id: sample.id, test_id: tid })))
    }
  }

  revalidatePath('/client/orders')
  redirect(`/client/orders/${order.id}`)
}
