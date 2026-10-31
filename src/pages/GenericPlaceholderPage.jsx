import React from 'react';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

export default function GenericPlaceholderPage({
  title = 'Module',
  subtitle = 'Manage your system records',
  breadcrumb = null,
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} breadcrumb={breadcrumb} />
      <EmptyState
        title={`${title} — Coming Next`}
        text={`The ${title.toLowerCase()} screen is configured and ready for the next implementation phase.`}
      />
    </div>
  );
}
