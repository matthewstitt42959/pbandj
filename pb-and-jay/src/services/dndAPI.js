export const fetchClasses = async () => {
    const res = await fetch('https://www.dnd5eapi.co/api/classes');
    return res.json();
}