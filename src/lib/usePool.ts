import type { Filters, GameId, Pool, Ticket } from "../types";
import { comboKey, generateTickets, newId } from "./picks";
import { GAMES } from "./prizes";
import { emptyPool, loadPool, savePool } from "./storage";
import { useCallback, useEffect, useState } from "react";

export function usePool() {
  const [pool, setPool] = useState<Pool>(() => loadPool() ?? emptyPool("powerball"));

  useEffect(() => {
    savePool(pool);
  }, [pool]);

  function setGame(game: GameId) {
    setPool((prev) =>
      prev.game === game ? prev : { ...prev, game, tickets: [] },
    );
  }

  function setName(name: string) {
    setPool((prev) => ({ ...prev, name }));
  }

  function addMember() {
    setPool((prev) => ({
      ...prev,
      members: [
        ...prev.members,
        { id: newId(), name: "", shares: 1, paid: false },
      ],
    }));
  }

  function updateMember(id: string, patch: Partial<Pool["members"][number]>) {
    setPool((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }

  function removeMember(id: string) {
    setPool((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }));
  }

  function addTickets(tickets: Ticket[]) {
    setPool((prev) => ({ ...prev, tickets: [...prev.tickets, ...tickets] }));
  }

  function removeTicket(id: string) {
    setPool((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((t) => t.id !== id),
    }));
  }

  function mintTickets(
    count: number,
    filters: Filters,
    past: Set<string>,
    avoid: Set<number> = new Set(),
  ): { added: number; rejected: number } {
    const spec = GAMES[pool.game];
    const exclude = new Set(pool.tickets.map((t) => comboKey(t.whites)));
    const taken = new Set(pool.tickets.flatMap((t) => t.whites));
    const result = generateTickets(spec, count, filters, past, exclude, avoid, taken);
    addTickets(result.tickets);
    return { added: result.tickets.length, rejected: result.rejected };
  }

  function reset() {
    setPool(emptyPool(pool.game));
  }

  const replacePool = useCallback((next: Pool) => {
    setPool(next);
  }, []);

  return {
    pool,
    setGame,
    setName,
    addMember,
    updateMember,
    removeMember,
    addTickets,
    removeTicket,
    mintTickets,
    replacePool,
    reset,
  };
}
