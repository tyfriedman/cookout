'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Recipe = {
  recipe_id: number;
  name: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  sugar: number;
  description: string;
  instructions: string;
  ingredients: string[];
};

export default function RecipeDetailPage() {
  const { recipe_id } = useParams(); // get ID from URL
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        setLoading(true);
        const res = await fetch(`/api/recipes/${recipe_id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch recipe');
        setRecipe(data.recipe);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe();
  }, [recipe_id]);

  if (loading) return <p>Loading recipe...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!recipe) return <p>Recipe not found</p>;

  return (
    <main style={{ padding: '40px' }}>
      <h1 style={{ fontSize: 40, marginBottom: 16 }}>{recipe.name}</h1>
      <p style={{ marginBottom: 20 }}>{recipe.calories} calories • {recipe.protein}g protein • {recipe.carb}g carbs • {recipe.sugar}g sugar • {recipe.fat}g fat</p>
      <p style={{ fontSize: 24 }}>Description:</p>
      <p style={{ marginBottom: 20 }}>blah blah blah</p>
      <p style={{ fontSize: 24, marginTop: 20, marginBottom: 5 }}>Ingredients:</p>
      <ul style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '12px 20px',
        marginLeft: 0, 
        marginBottom: 20, 
        paddingLeft: 24,
        listStyleType: 'disc'
      }}> 
        {recipe.ingredients
          ?.filter((ingredient) => ingredient && ingredient.trim().length > 0)
          .map((ingredient, index) => (
            <li key={index} style={{ lineHeight: 1.6, paddingLeft: 4 }}>
              {ingredient}
            </li>
          ))}
      </ul>
      <p style={{ fontSize: 24, marginTop: 20, marginBottom: 5 }}>Instructions:</p>
      <ol style={{ marginLeft: 24, marginBottom: 20, paddingLeft: 0, listStylePosition: 'inside' }}>
        {recipe.instructions
          .split('|')
          .map((instruction) => instruction.trim())
          .filter((instruction) => instruction.length > 0)
          .map((instruction, index) => (
            <li key={index} style={{ marginBottom: 12, lineHeight: 1.6 }}>
              {index + 1}. {instruction}
            </li>
          ))}
      </ol>
    </main>
  );
}
