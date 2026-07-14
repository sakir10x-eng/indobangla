import { useMutation } from 'react-query';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';

/** Create a shipment for an order with the chosen courier (redx/steadfast/…). */
export const useCreateShipmentMutation = () =>
  useMutation(
    ({ provider, order_id }: { provider: string; order_id: any }) =>
      HttpClient.post<any>(`courier-shipment/${provider}`, { order_id }),
    {
      onError: (e: any) =>
        toast.error(e?.response?.data?.message || 'Shipment failed'),
    },
  );

/** Track a shipment by courier + tracking id. */
export const useCourierTrackMutation = () =>
  useMutation(
    ({ provider, tracking_id }: { provider: string; tracking_id: string }) =>
      HttpClient.get<any>(`courier-track/${provider}`, { tracking_id }),
    {
      onError: (e: any) =>
        toast.error(e?.response?.data?.message || 'Tracking failed'),
    },
  );
