'use client';

import {useState, useEffect} from 'react';
import {
  getCollection,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/lib/firestore';
import {QueryConstraint} from "firebase/firestore";

export function useFirestoreCollection<T = any>(
  collectionName: string,
  constraints?: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getCollection(collectionName, constraints);
        setData(result as T[]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionName, constraints]);

  const refetch = async () => {
    try {
      setLoading(true);
      const result = await getCollection(collectionName, constraints);
      setData(result as T[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refetch data');
    } finally {
      setLoading(false);
    }
  };

  return {data, loading, error, refetch};
}

export function useFirestoreDocument<T = any>(collectionName: string, docId: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const result = await getDocument(collectionName, docId);
        setData(result as T);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [collectionName, docId]);

  const refetch = async () => {
    if (!docId) return;

    try {
      setLoading(true);
      const result = await getDocument(collectionName, docId);
      setData(result as T);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refetch document');
    } finally {
      setLoading(false);
    }
  };

  return {data, loading, error, refetch};
}

export function useFirestoreMutations(collectionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const id = await createDocument(collectionName, data);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const update = async (docId: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      await updateDocument(collectionName, docId, data);
      return docId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (docId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteDocument(collectionName, docId);
      return docId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {create, update, remove, loading, error};
}
