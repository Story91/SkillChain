// app/api/users/route.ts
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Schemat EAS dla umiejętności
const SKILLS_SCHEMA_UID = "0x7889a09fb295b0a0c63a3d7903c4f00f7896cca4fa64d2c1313f8547390b7d39";
const EAS_GRAPHQL_URL = "https://base.easscan.org/graphql";

type Attestation = {
  decodedDataJson: string;
  attester: string;
  recipient: string;
  time: string;
  id: string;
  txid: string;
};

type UserWithSkill = {
  address: string;
  skillLevel: string;
  endorsements: number;
  timestamp: string;
};

// Funkcja do pobierania użytkowników z określoną umiejętnością
async function fetchUsersWithSkill(skillName: string): Promise<UserWithSkill[]> {
  // Najpierw pobieramy wszystkie atestacje dla danej umiejętności
  const query = `
    query GetAttestations {
      attestations(
        where: { 
          schemaId: { equals: "${SKILLS_SCHEMA_UID}" }
        }
        orderBy: { time: desc }
        take: 200
      ) {
        decodedDataJson
        attester
        recipient
        time
        id
        txid
      }
    }
  `;

  const response = await fetch(EAS_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const { data } = await response.json();
  
  // Struktura do śledzenia użytkowników i ich endorsements
  const userSkillMap = new Map<string, {
    address: string;
    skillLevel: string;
    endorsements: number;
    timestamp: string;
    attestationIds: Set<string>; // Dla unikania duplikatów
  }>();
  
  // Najpierw znajdujemy użytkowników, którzy mają tę umiejętność
  (data?.attestations ?? []).forEach((attestation: Attestation) => {
    try {
      const parsedData = JSON.parse(attestation?.decodedDataJson ?? "[]");
      
      const skillNameFromAttestation = parsedData[0].value?.value;
      
      // Jeśli to nie jest ta umiejętność, pomijamy
      if (skillNameFromAttestation.toLowerCase() !== skillName.toLowerCase()) {
        return;
      }
      
      const skillLevel = parsedData[2].value?.value;
      const recipient = attestation.recipient.toLowerCase();
      const attester = attestation.attester.toLowerCase();
      const timestamp = attestation.time;
      
      // Jeśli to deklaracja umiejętności (self-attestation)
      if (attester === recipient) {
        // Dodaj lub zaktualizuj mapę
        if (!userSkillMap.has(recipient)) {
          userSkillMap.set(recipient, {
            address: recipient,
            skillLevel,
            endorsements: 0,
            timestamp,
            attestationIds: new Set([attestation.id])
          });
        } else {
          // Update skill level if this is a newer attestation
          const existingUser = userSkillMap.get(recipient)!;
          const existingTimestamp = new Date(existingUser.timestamp).getTime();
          const newTimestamp = new Date(timestamp).getTime();
          
          if (newTimestamp > existingTimestamp) {
            existingUser.skillLevel = skillLevel;
            existingUser.timestamp = timestamp;
          }
          
          existingUser.attestationIds.add(attestation.id);
        }
      } 
      // Jeśli to potwierdzenie umiejętności (endorsement)
      else if (userSkillMap.has(recipient)) {
        const user = userSkillMap.get(recipient)!;
        // Upewniamy się, że nie liczymy tego samego endorsementu wielokrotnie
        if (!user.attestationIds.has(attestation.id)) {
          user.endorsements += 1;
          user.attestationIds.add(attestation.id);
        }
      }
    } catch (error) {
      console.error("Error parsing attestation:", error);
    }
  });
  
  // Konwertujemy mapę na listę i sortujemy po liczbie endorsements
  return Array.from(userSkillMap.values())
    .map(user => ({
      address: user.address,
      skillLevel: user.skillLevel,
      endorsements: user.endorsements,
      timestamp: user.timestamp
    }))
    .sort((a, b) => b.endorsements - a.endorsements);
}

// Funkcja do wyszukiwania użytkowników po adresie lub ENS
async function searchUsers(query: string): Promise<{ address: string }[]> {
  if (!query || query.length < 3) {
    return [];
  }
  
  // Implementacja zależy od dostępnych API i baz danych
  // Tutaj przykładowe wykorzystanie EAS do znalezienia adresów z atestacjami
  
  const graphqlQuery = `
    query SearchUsers {
      attestations(
        where: { 
          schemaId: { equals: "${SKILLS_SCHEMA_UID}" }
        }
        orderBy: { time: desc }
        take: 100
      ) {
        recipient
      }
    }
  `;

  const response = await fetch(EAS_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: graphqlQuery }),
  });

  const { data } = await response.json();
  
  // Pobieranie unikalnych adresów
  const uniqueAddresses = new Set<string>();
  
  (data?.attestations ?? []).forEach((attestation: { recipient: string }) => {
    uniqueAddresses.add(attestation.recipient.toLowerCase());
  });
  
  // Filtrowanie adresów zawierających zapytanie
  const filteredAddresses = Array.from(uniqueAddresses)
    .filter(address => address.includes(query.toLowerCase()))
    .map(address => ({ address }));
  
  return filteredAddresses.slice(0, 10); // Ograniczamy wyniki
}

// API Route dla pobierania użytkowników z określoną umiejętnością
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skillName = searchParams.get('skill');
  const searchQuery = searchParams.get('query');
  
  try {
    if (skillName) {
      const users = await fetchUsersWithSkill(skillName);
      return Response.json({ success: true, users });
    } else if (searchQuery) {
      const users = await searchUsers(searchQuery);
      return Response.json({ success: true, users });
    } else {
      return Response.json(
        { success: false, error: "Either skill or query parameter is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}