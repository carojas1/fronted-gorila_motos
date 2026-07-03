import { create } from 'zustand';
import { mantenimientoParametrosApi } from './api';
import { INTERVALOS } from './mantenimiento';

export interface ParametroMantenimiento {
  idParametro: number;
  ccMin: number;
  ccMax: number | null;
  tipoMantenimiento: string;
  intervaloKm: number;
  descripcion: string;
}

interface IntervalosState {
  parametros: ParametroMantenimiento[];
  loading: boolean;
  fetchParametros: () => Promise<void>;
  updateIntervalo: (id: number, intervaloKm: number) => Promise<void>;
}

export const useIntervalosStore = create<IntervalosState>((set, get) => ({
  parametros: [],
  loading: false,
  fetchParametros: async () => {
    set({ loading: true });
    try {
      const { data } = await mantenimientoParametrosApi.list();
      set({ parametros: data });
      
      // Update the local in-memory INTERVALOS so all views show the updated logic!
      data.forEach(dbParam => {
        const rangoObj = INTERVALOS.find(r => 
          r.rango.ccMin === dbParam.ccMin && r.rango.ccMax === dbParam.ccMax
        );
        if (rangoObj) {
          const paramObj = rangoObj.params.find(p => p.tipo === dbParam.tipoMantenimiento);
          if (paramObj) {
            paramObj.intervaloKm = dbParam.intervaloKm;
          }
        }
      });
    } catch (err) {
      console.error('Error fetching parametros mantenimiento', err);
    } finally {
      set({ loading: false });
    }
  },
  updateIntervalo: async (id, intervaloKm) => {
    try {
      const { data } = await mantenimientoParametrosApi.update(id, intervaloKm);
      set(state => {
        const newData = state.parametros.map(p => p.idParametro === id ? data : p);
        // Also update local INTERVALOS
        newData.forEach(dbParam => {
          const rangoObj = INTERVALOS.find(r => 
            r.rango.ccMin === dbParam.ccMin && r.rango.ccMax === dbParam.ccMax
          );
          if (rangoObj) {
            const paramObj = rangoObj.params.find(p => p.tipo === dbParam.tipoMantenimiento);
            if (paramObj) {
              paramObj.intervaloKm = dbParam.intervaloKm;
            }
          }
        });
        return { parametros: newData };
      });
    } catch (err) {
      console.error('Error updating parametro', err);
      throw err;
    }
  }
}));
