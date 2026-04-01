"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Github, Linkedin, Globe } from "lucide-react"

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
import Link from "next/link"
import type { Member } from "@/types/member"

interface Props {
  members: Member[]
}

export default function MembersPageClient({ members }: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">メンバー紹介</h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosを運営するメンバーたち。イベントの計画・運営を行っています。
            </p>
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
              <Card
                key={member.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card cursor-pointer"
                onClick={() => setSelectedMember(member)}
              >
                <div className="aspect-square relative">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={`${member.name}の写真`}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="text-xl font-bold text-foreground">{member.name}</h3>
                  <p className="text-accent-foreground font-medium">{member.role}</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {member.department} {member.year}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-foreground">{selectedMember.name}</DialogTitle>
                <DialogDescription className="text-accent-foreground font-medium">
                  {selectedMember.role} | {selectedMember.department} {selectedMember.year}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 mt-4">
                <div className="aspect-square relative rounded-lg overflow-hidden">
                  <Image
                    src={selectedMember.image || "/placeholder.svg"}
                    alt={`${selectedMember.name}の写真`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-foreground mb-4">{selectedMember.bio}</p>
                  <div className="mb-4">
                    <h4 className="font-bold text-sm text-muted-foreground mb-2">スキル</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.skills.map((skill, index) => (
                        <span key={index} className="bg-secondary text-primary text-xs px-2 py-1 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedMember.social && (
                    <div>
                      <h4 className="font-bold text-sm text-muted-foreground mb-2">SNS / ウェブサイト</h4>
                      <div className="flex gap-3">
                        {selectedMember.social.github && (
                          <Link
                            href={selectedMember.social.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="GitHub"
                          >
                            <Github className="h-5 w-5" />
                          </Link>
                        )}
                        {selectedMember.social.x && (
                          <Link
                            href={selectedMember.social.x}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="X"
                          >
                            <XIcon className="h-5 w-5" />
                          </Link>
                        )}
                        {selectedMember.social.linkedin && (
                          <Link
                            href={selectedMember.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="LinkedIn"
                          >
                            <Linkedin className="h-5 w-5" />
                          </Link>
                        )}
                        {selectedMember.social.website && (
                          <Link
                            href={selectedMember.social.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="ウェブサイト"
                          >
                            <Globe className="h-5 w-5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
