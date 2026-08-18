import { createClient } from '@/lib/supabase/server'
import { FileText, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  Page, PageHeader, Badge, Mono, ButtonLink,
  Table, Th, Td, Tr, TableWrap, EmptyState,
} from '@/components/ui/primitives'

export default async function ReportsPage() {
  const supabase = await createClient()

  // Get completed orders that have approved results
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      date_completed,
      samples (
        sample_tests (
          id,
          status
        )
      )
    `)
    .eq('status', 'completed')
    .order('date_completed', { ascending: false })

  // Filter to only orders with at least one approved result
  const ordersWithApproved = (orders ?? []).filter(order => {
    const allTests = order.samples.flatMap((s: { sample_tests: { id: string; status: string }[] }) => s.sample_tests)
    return allTests.some((t: { status: string }) => t.status === 'approved')
  })

  return (
    <Page>
      <PageHeader
        icon={FileText}
        title="Reports"
        description="Completed orders whose results have been signed off"
        meta={<>{ordersWithApproved.length} report{ordersWithApproved.length === 1 ? '' : 's'} available</>}
      />

      {ordersWithApproved.length === 0 ? (
        <TableWrap>
          <EmptyState
            icon={FileText}
            title="No reports available yet"
            description="A report appears here once an order is completed and its results are approved."
            action={<ButtonLink href="/admin/work-queue?status=approved" variant="secondary">Open work queue</ButtonLink>}
          />
        </TableWrap>
      ) : (
        <TableWrap maxHeight="calc(100vh - 220px)">
          <Table>
            <thead>
              <tr>
                <Th width="140px">Order #</Th>
                <Th>Client</Th>
                <Th width="140px">Completed</Th>
                <Th width="140px">Approved results</Th>
                <Th width="140px" align="right" />
              </tr>
            </thead>
            <tbody>
              {ordersWithApproved.map(order => {
                const allTests = order.samples.flatMap((s: { sample_tests: { id: string; status: string }[] }) => s.sample_tests)
                const approvedCount = allTests.filter((t: { status: string }) => t.status === 'approved').length
                return (
                  <Tr key={order.id}>
                    <Td className="whitespace-nowrap">
                      <Mono className="font-medium text-ink">{order.order_number}</Mono>
                    </Td>
                    <Td className="text-ink-2">{order.customer_name ?? '—'}</Td>
                    <Td className="whitespace-nowrap tabular text-[12.5px] text-ink-2">
                      {formatDate(order.date_completed)}
                    </Td>
                    <Td>
                      <Badge tone="ok" dot>{approvedCount} approved</Badge>
                    </Td>
                    <Td align="right">
                      <ButtonLink href={`/admin/reports/${order.id}`} variant="secondary" size="sm">
                        <ExternalLink className="h-3 w-3" /> View report
                      </ButtonLink>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Page>
  )
}
