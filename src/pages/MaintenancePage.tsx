import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const MaintenancePage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Maintenance</h1>
        <Button variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Add Maintenance Record
        </Button>
      </div>
      
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">No maintenance records found</p>
          <Button variant="violet">
            <Plus className="h-4 w-4 mr-2" />
            Record your first maintenance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenancePage;
