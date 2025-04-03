import { type Address } from 'viem';

// Schemat EAS dla umiejętności
export const SKILLS_SCHEMA_UID = "0x7889a09fb295b0a0c63a3d7903c4f00f7896cca4fa64d2c1313f8547390b7d39";
export const EAS_CONTRACT = "0x4200000000000000000000000000000000000021"; // Adres kontraktu EAS na Base
export const EAS_GRAPHQL_URL = "https://base.easscan.org/graphql";

// Typy dla attestacji umiejętności
export type SkillMilestoneAttestation = {
  attestationUid: string;
  transactionHash: string;
  attester: Address;
  skillName: string;
  endorsementCount: number;
  timestamp: string;
};

// Funkcja do dekodowania danych attestacji
function decodeAttestationData(decodedDataJson: string): { skillName: string; endorsementCount: number } | null {
  try {
    const parsedData = JSON.parse(decodedDataJson);
    const pattern = /(0x[a-fA-F0-9]{40}) achieved (\d+) endorsements for (.+)/;
    const match = parsedData[0]?.value?.value?.match(pattern);
    
    if (match) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, address, endorsementCount, skillName] = match;
      return {
        skillName,
        endorsementCount: parseInt(endorsementCount)
      };
    }
    return null;
  } catch (error) {
    console.error("Error decoding attestation data:", error);
    return null;
  }
}

// Funkcja do pobierania attestacji umiejętności
export async function fetchSkillMilestoneAttestations(address?: Address): Promise<SkillMilestoneAttestation[]> {
  let whereClause = `schemaId: { equals: "${SKILLS_SCHEMA_UID}" }`;
  
  if (address) {
    whereClause += `, attester: { equals: "${address}" }`;
  }

  const query = `
    query GetAttestations {
      attestations(
        where: { ${whereClause} }
        orderBy: { time: desc }
        take: 10
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

  try {
    const response = await fetch(EAS_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const { data } = await response.json();
    
    return (data?.attestations ?? [])
      .map((attestation: any) => {
        const decodedData = decodeAttestationData(attestation?.decodedDataJson ?? "[]");
        
        if (decodedData) {
          return {
            attestationUid: attestation.id,
            transactionHash: attestation.txid,
            attester: attestation.attester as Address,
            skillName: decodedData.skillName,
            endorsementCount: decodedData.endorsementCount,
            timestamp: attestation.time
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a: SkillMilestoneAttestation, b: SkillMilestoneAttestation) => 
        b.endorsementCount - a.endorsementCount
      );
  } catch (error) {
    console.error("Error fetching attestations:", error);
    return [];
  }
}

// Funkcja do sprawdzania, czy umiejętność została już zatwierdzona
export async function hasSkillMilestoneAttestation(
  address: Address,
  skillName: string,
  endorsementCount: number
): Promise<boolean> {
  const attestations = await fetchSkillMilestoneAttestations(address);
  
  return attestations.some(
    att => att.skillName === skillName && att.endorsementCount === endorsementCount
  );
} 