import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopBar } from '@/components/TopBar';
import { HealthCheck } from '@/components/HealthCheck';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { createTestDeliveryOrder, createBulkTestOrders, cleanupTestOrders } from '@/utils/createTestOrder';
import { debugAddressInsertion } from '@/utils/debugAddress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Order } from '@/lib/types';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function Settings() {
  const { online } = useRealtimeStatus();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteCode, setDeleteCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleOrderClick = (order: Order) => {
    // Navigate to dashboard and show order
    navigate('/', { state: { selectedOrder: order } });
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Fejl",
          description: "Kunne ikke logge ud",
          variant: "destructive"
        });
      } else {
        navigate('/login');
      }
    } catch {
      toast({
        title: "Fejl", 
        description: "Der opstod en uventet fejl",
        variant: "destructive"
      });
    }
  };

  const handleCreateTestOrder = async () => {
    try {
      await createTestDeliveryOrder();
      toast({
        title: "Test ordre oprettet",
        description: "En test leveringsordre er blevet oprettet"
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette test ordre",
        variant: "destructive"
      });
    }
  };

  const handleCreateBulkTestOrders = async () => {
    try {
      const orders = await createBulkTestOrders();
      toast({
        title: "Test ordrer oprettet",
        description: `${orders?.length || 7} forskellige test ordrer er blevet oprettet`
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette test ordrer",
        variant: "destructive"
      });
    }
  };

  const handleCleanupTestOrders = async () => {
    try {
      await cleanupTestOrders();
      toast({
        title: "Test ordrer ryddet op",
        description: "Alle test ordrer er blevet slettet"
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke rydde op i test ordrer",
        variant: "destructive"
      });
    }
  };

  const handleDebugAddress = async () => {
    try {
      const result = await debugAddressInsertion();
      toast({
        title: "Debug test udført",
        description: "Tjek konsollen for detaljer om adresse håndtering"
      });
    } catch (error) {
      toast({
        title: "Debug fejl",
        description: "Kunne ikke udføre debug test",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteCode !== '657') {
      toast({
        title: "Forkert kode",
        description: "Indtast den korrekte sikkerhedskode",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all orders (this will also delete all customers since they're based on orders)
      const { error } = await supabase
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all orders

      if (error) throw error;

      // Clear all query caches
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });

      toast({
        title: "Alle data slettet",
        description: "Alle ordrer og kunder er blevet permanent slettet"
      });

      setDeleteCode('');
    } catch (error) {
      console.error('Error deleting all data:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke slette alle data",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar onOrderClick={handleOrderClick} />

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-ink">Udvikler Indstillinger</h1>
          <p className="text-sm text-ink-dim">Test værktøjer og system status</p>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-ink-dim">Realtime forbindelse</span>
              <HealthCheck isConnected={online} />
            </div>
          </CardContent>
        </Card>

        {/* Development Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Udviklings værktøjer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              onClick={handleCreateTestOrder}
              className="w-full min-h-[44px]"
            >
              Opret test leveringsordre
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCreateBulkTestOrders}
              className="w-full min-h-[44px] bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              Opret 7 forskellige test ordrer
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCleanupTestOrders}
              className="w-full min-h-[44px]"
            >
              Ryd op i test ordrer
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDebugAddress}
              className="w-full min-h-[44px] bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
            >
              🔍 Debug adresse problem
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const { debugOrderLines } = await import('@/utils/debugOrderLines');
                  await debugOrderLines();
                  toast({
                    title: "Debug udført",
                    description: "Tjek konsollen for ordre line data",
                  });
                } catch (error) {
                  toast({
                    title: "Debug fejl",
                    description: "Kunne ikke udføre debug",
                    variant: "destructive"
                  });
                }
              }}
              className="w-full min-h-[44px] bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
            >
              🔍 Debug ordre lines
            </Button>
          </CardContent>
        </Card>
        
        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Farlig Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <h4 className="font-semibold text-destructive mb-2">⚠️ Slet alle data</h4>
              <p className="text-sm text-destructive/80 mb-3">
                Dette vil permanent slette ALLE ordrer og kunder. Denne handling kan ikke fortrydes!
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full min-h-[44px]"
                  >
                    🗑️ Slet alle data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ ADVARSEL: Slet alle data</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>Du er ved at slette ALLE ordrer og kunder permanent.</p>
                      <p className="font-semibold text-destructive">Denne handling kan IKKE fortrydes!</p>
                      <div className="space-y-2">
                        <Label htmlFor="deleteCode">Indtast sikkerhedskode for at fortsætte:</Label>
                        <Input
                          id="deleteCode"
                          type="password"
                          value={deleteCode}
                          onChange={(e) => setDeleteCode(e.target.value)}
                          placeholder="Indtast kode..."
                          className="min-h-[44px]"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteCode('')}>
                      Annuller
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllData}
                      disabled={deleteCode !== '657' || isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? 'Sletter...' : '🗑️ SLET ALT'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Konto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="w-full min-h-[44px]"
            >
              Log ud
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}