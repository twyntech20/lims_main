import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderKanban, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  Page, PageHeader, FilterBar, SearchField, ButtonLink, IconButton, Mono, Stacked,
  Table, Th, Td, Tr, TableWrap, EmptyState,
} from '@/components/ui/primitives'

interface SearchParams { search?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function ProjectsPage({ searchParams }: Props) {
  const { search } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('id, project_name, project_no, project_code, project_man, date_receive, date_complete, created_at')
    .order('project_name')

  if (search) {
    query = query.or(
      `project_name.ilike.%${search}%,project_no.ilike.%${search}%,project_code.ilike.%${search}%,project_man.ilike.%${search}%`
    )
  }

  const { data: projects } = await query
  const rows = projects ?? []

  return (
    <Page>
      <PageHeader
        title="Projects"
        description="Client programmes that group related laboratory orders"
        meta={<>{rows.length} project{rows.length === 1 ? '' : 's'}</>}
        actions={
          <ButtonLink href="/admin/projects/new" variant="primary">
            <Plus className="h-3.5 w-3.5" /> New project
          </ButtonLink>
        }
      />

      <FilterBar clearHref="/admin/projects" active={!!search} count={rows.length}>
        <SearchField name="search" defaultValue={search} placeholder="Search name, number, code or manager…" />
      </FilterBar>

      {rows.length === 0 ? (
        <TableWrap>
          {search ? (
            <EmptyState
              icon={FolderKanban}
              title="No results found"
              description="Try adjusting your search."
              action={<ButtonLink href="/admin/projects" variant="secondary">Clear search</ButtonLink>}
              compact
            />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project to group related orders under one programme."
              action={<ButtonLink href="/admin/projects/new" variant="primary"><Plus className="h-3.5 w-3.5" /> New project</ButtonLink>}
            />
          )}
        </TableWrap>
      ) : (
        <TableWrap maxHeight="calc(100vh - 260px)">
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th width="120px">Number</Th>
                <Th width="120px">Code</Th>
                <Th width="160px">Manager</Th>
                <Th width="120px">Received</Th>
                <Th width="120px">Completed</Th>
                <Th width="52px" align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.map(project => (
                <Tr key={project.id}>
                  <Td>
                    <Stacked
                      primary={
                        <Link href={`/admin/projects/${project.id}`} className="font-medium hover:text-brand-600">
                          {project.project_name}
                        </Link>
                      }
                      secondary={project.created_at ? `Created ${formatDate(project.created_at)}` : undefined}
                    />
                  </Td>
                  <Td className="whitespace-nowrap">
                    {project.project_no ? <Mono className="text-ink-2">{project.project_no}</Mono> : <span className="text-ink-4">—</span>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {project.project_code ? <Mono className="text-ink-2">{project.project_code}</Mono> : <span className="text-ink-4">—</span>}
                  </Td>
                  <Td className="text-[12.5px] text-ink-2">{project.project_man ?? <span className="text-ink-4">—</span>}</Td>
                  <Td className="whitespace-nowrap tabular text-[12.5px] text-ink-2">{project.date_receive ?? '—'}</Td>
                  <Td className="whitespace-nowrap tabular text-[12.5px] text-ink-2">{project.date_complete ?? '—'}</Td>
                  <Td align="right">
                    <IconButton href={`/admin/projects/${project.id}`} label={`Edit ${project.project_name}`} icon={Pencil} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Page>
  )
}
