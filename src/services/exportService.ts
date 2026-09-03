import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Classroom, DAY_NAMES, DAY_SHORT_NAMES, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { Schedule } from '../types/schedule';

export interface PDFExportOptions {
  scope: 'classes' | 'teachers' | 'master_grid';
  targetClassId?: string; // 'all' or specific classId
  targetTeacherId?: string; // 'all' or specific teacherId
  language?: 'ru' | 'uz';
  includeDirectorSignature?: boolean;
  onProgress?: (current: number, total: number, message: string) => void;
}

const UZ_DAY_NAMES: Record<number, string> = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba',
};

export const exportService = {
  /**
   * Generates a multi-tab formatted Excel workbook
   */
  exportToExcel: (
    schedule: Schedule,
    teachers: Teacher[],
    classes: SchoolClass[],
    subjects: Subject[],
    rooms: Classroom[],
    settings: ScheduleSettings,
    language: 'ru' | 'uz' = 'ru'
  ) => {
    const wb = XLSX.utils.book_new();

    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const dayLabels = language === 'uz' ? UZ_DAY_NAMES : DAY_NAMES;

    // Sheet 1: Classes Schedule
    const classRows: any[][] = [];
    classRows.push([
      settings.schoolName || (language === 'uz' ? "1-sonli umumiy o'rta ta'lim maktabi" : 'Школа №1'),
      language === 'uz'
        ? `Sinflar bo'yicha dars jadvali (${settings.academicYear || '2026-2027'})`
        : `Расписание уроков по классам (${settings.academicYear || '2026-2027'})`,
    ]);
    classRows.push([]);

    const headerRow = [language === 'uz' ? 'Sinf' : 'Класс', language === 'uz' ? 'Dars / Vaqt' : 'Урок / Время'];
    settings.workingDays.forEach((day) => {
      headerRow.push(dayLabels[day] || `Kun ${day}`);
    });
    classRows.push(headerRow);

    classes.forEach((cls) => {
      const maxPeriod = Math.max(...settings.workingDays.map((d) => settings.periodsPerDay[d] || 7));
      for (let p = 1; p <= maxPeriod; p++) {
        const timeConfig = settings.periodTimes.find((pt) => pt.period === p);
        const timeStr = timeConfig ? `${timeConfig.startTime}-${timeConfig.endTime}` : '';
        const row: any[] = [p === 1 ? cls.name : '', `${p}-dars ${timeStr}`];

        settings.workingDays.forEach((day) => {
          const maxP = settings.periodsPerDay[day] || 7;
          if (p > maxP) {
            row.push('—');
            return;
          }
          const entry = schedule.entries.find((e) => e.classId === cls.id && e.day === day && e.period === p);
          if (entry) {
            const sub = subjectMap.get(entry.subjectId)?.name || 'Dars';
            const tch = teacherMap.get(entry.teacherId)?.shortName || teacherMap.get(entry.teacherId)?.fullName || '';
            const rm = roomMap.get(entry.classroomId)?.roomNumber || '';
            row.push(`${sub}\n(${tch}${rm ? `, x.${rm}` : ''})`);
          } else {
            row.push('');
          }
        });
        classRows.push(row);
      }
      classRows.push([]); // spacer
    });

    const wsClasses = XLSX.utils.aoa_to_sheet(classRows);
    XLSX.utils.book_append_sheet(
      wb,
      wsClasses,
      language === 'uz' ? 'Sinflar jadvali' : 'Расписание по классам'
    );

    // Sheet 2: Teachers Schedule
    const teacherRows: any[][] = [];
    teacherRows.push([
      settings.schoolName,
      language === 'uz'
        ? `O'qituvchilar bo'yicha dars jadvali (${settings.academicYear})`
        : `Расписание по преподавателям (${settings.academicYear})`,
    ]);
    teacherRows.push([]);
    teacherRows.push([
      language === 'uz' ? "O'qituvchi" : 'Учитель',
      language === 'uz' ? 'Dars' : 'Урок',
      ...settings.workingDays.map((d) => dayLabels[d]),
    ]);

    teachers.forEach((tch) => {
      const maxPeriod = Math.max(...settings.workingDays.map((d) => settings.periodsPerDay[d] || 7));
      for (let p = 1; p <= maxPeriod; p++) {
        const row: any[] = [p === 1 ? tch.fullName : '', `${p}-dars`];

        settings.workingDays.forEach((day) => {
          const maxP = settings.periodsPerDay[day] || 7;
          if (p > maxP) {
            row.push('—');
            return;
          }
          const entry = schedule.entries.find((e) => e.teacherId === tch.id && e.day === day && e.period === p);
          if (entry) {
            const cls = classMap.get(entry.classId)?.name || 'Sinf';
            const sub = subjectMap.get(entry.subjectId)?.shortName || subjectMap.get(entry.subjectId)?.name || 'Fan';
            const rm = roomMap.get(entry.classroomId)?.roomNumber || '';
            row.push(`${cls}: ${sub} (${rm ? `x.${rm}` : ''})`);
          } else {
            row.push('');
          }
        });
        teacherRows.push(row);
      }
      teacherRows.push([]);
    });

    const wsTeachers = XLSX.utils.aoa_to_sheet(teacherRows);
    XLSX.utils.book_append_sheet(
      wb,
      wsTeachers,
      language === 'uz' ? "O'qituvchilar jadvali" : 'Расписание учителей'
    );

    const fileName = `Dars_Jadvali_${settings.academicYear || '2026-2027'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  },

  /**
   * Generates a publication-grade, official school timetable PDF in A4 Landscape
   */
  exportToPDF: async (
    schedule: Schedule,
    teachers: Teacher[],
    classes: SchoolClass[],
    subjects: Subject[],
    rooms: Classroom[],
    settings: ScheduleSettings,
    options: PDFExportOptions = { scope: 'classes', language: 'uz' }
  ): Promise<void> => {
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const isUz = options.language === 'uz';
    const dayLabels = isUz ? UZ_DAY_NAMES : DAY_NAMES;
    const maxPeriod = Math.max(...settings.workingDays.map((d) => settings.periodsPerDay[d] || 7));

    // Create off-screen rendering canvas
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-99999px';
    container.style.left = '-99999px';
    container.style.width = '1400px';
    container.style.height = '990px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    container.style.boxSizing = 'border-box';
    document.body.appendChild(container);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let pagesToRender: Array<{
      type: 'class' | 'teacher' | 'master';
      data: any;
      title: string;
    }> = [];

    if (options.scope === 'classes') {
      const targetClasses =
        options.targetClassId && options.targetClassId !== 'all'
          ? classes.filter((c) => c.id === options.targetClassId)
          : classes;

      pagesToRender = targetClasses.map((cls) => ({
        type: 'class',
        data: cls,
        title: cls.name,
      }));
    } else if (options.scope === 'teachers') {
      const targetTeachers =
        options.targetTeacherId && options.targetTeacherId !== 'all'
          ? teachers.filter((t) => t.id === options.targetTeacherId)
          : teachers.filter((t) => schedule.entries.some((e) => e.teacherId === t.id));

      pagesToRender = targetTeachers.map((tch) => ({
        type: 'teacher',
        data: tch,
        title: tch.fullName,
      }));
    } else {
      // Master Summary Grid
      pagesToRender = [
        {
          type: 'master',
          data: classes,
          title: isUz ? 'Umumiy maktab dars jadvali' : 'Сводное расписание школы',
        },
      ];
    }

    const totalPages = pagesToRender.length;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageItem = pagesToRender[pageIdx];

      if (options.onProgress) {
        options.onProgress(
          pageIdx + 1,
          totalPages,
          isUz
            ? `${pageIdx + 1}-sahifa tayyorlanmoqda (jami ${totalPages})...`
            : `Формирование страницы ${pageIdx + 1} из ${totalPages}...`
        );
      }

      if (pageItem.type === 'class') {
        const cls: SchoolClass = pageItem.data;
        const classEntries = schedule.entries.filter((e) => e.classId === cls.id);
        const totalLessons = classEntries.length;

        container.innerHTML = `
          <div style="width: 1400px; height: 990px; box-sizing: border-box; padding: 28px 36px 20px 36px; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; justify-content: space-between;">
            
            <!-- HEADER -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px;">
                <div>
                  <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: -0.01em;">
                    ${settings.schoolName || (isUz ? "1-SONLI UMUMIY O'RTA TA'LIM MAKTABI" : 'ГОСУДАРСТВЕННАЯ ШКОЛА № 1')}
                  </h1>
                  <div style="font-size: 13.5px; font-weight: 700; color: #475569; margin-top: 3px;">
                    ${isUz ? 'RASMIY DARS JADVALI' : 'ОФИЦИАЛЬНОЕ РАСПИСАНИЕ УРОКОВ'} • ${settings.academicYear || '2026–2027'} • ${cls.shift || 1}-${isUz ? 'smena' : 'смена'}
                  </div>
                </div>

                <div style="text-align: right;">
                  <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 6px 22px; border-radius: 8px; font-size: 17px; font-weight: 800; letter-spacing: 0.04em;">
                    ${cls.name} ${isUz ? 'SINF' : 'КЛАСС'}
                  </div>
                  <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-top: 4px;">
                    ${cls.studentCount || 0} ${isUz ? "nafar o'quvchi" : 'учеников'} • ${totalLessons} ${isUz ? 'soat/hafta' : 'уроков в неделю'}
                  </div>
                </div>
              </div>
            </div>

            <!-- MAIN TABLE -->
            <div style="flex: 1; display: flex; flex-direction: column; margin-top: 10px;">
              <table style="width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed;">
                <thead>
                  <tr style="background: #0f172a; color: #ffffff; height: 38px;">
                    <th style="width: 48px; border: 1.5px solid #0f172a; text-align: center; font-size: 13px; font-weight: 800;">№</th>
                    <th style="width: 115px; border: 1.5px solid #0f172a; text-align: center; font-size: 13px; font-weight: 800;">${isUz ? 'Vaqt' : 'Время'}</th>
                    ${settings.workingDays
                      .map(
                        (d) => `
                      <th style="border: 1.5px solid #0f172a; text-align: center; font-size: 13.5px; font-weight: 800; padding: 4px 6px;">
                        ${dayLabels[d]}
                      </th>
                    `
                      )
                      .join('')}
                  </tr>
                </thead>
                <tbody>
                  ${Array.from({ length: maxPeriod }, (_, i) => i + 1)
                    .map((p) => {
                      const timeConfig = settings.periodTimes.find((pt) => pt.period === p);
                      const timeStr = timeConfig ? `${timeConfig.startTime} – ${timeConfig.endTime}` : '';
                      const isEven = p % 2 === 0;

                      return `
                      <tr style="background: ${isEven ? '#f8fafc' : '#ffffff'};">
                        <td style="border: 1.5px solid #cbd5e1; text-align: center; font-size: 16px; font-weight: 800; color: #0f172a; background: #f1f5f9;">
                          ${p}
                        </td>
                        <td style="border: 1.5px solid #cbd5e1; text-align: center; font-size: 11.5px; font-weight: 700; color: #334155; font-family: 'SF Mono', Consolas, monospace;">
                          ${timeStr}
                        </td>
                        ${settings.workingDays
                          .map((d) => {
                            const maxP = settings.periodsPerDay[d] || 7;
                            if (p > maxP) {
                              return `<td style="border: 1.5px solid #cbd5e1; text-align: center; color: #cbd5e1; font-weight: bold;">—</td>`;
                            }

                            const entry = classEntries.find((e) => e.day === d && e.period === p);
                            if (!entry) {
                              return `<td style="border: 1.5px solid #cbd5e1; text-align: center; color: #e2e8f0; font-weight: bold;">—</td>`;
                            }

                            const sub = subjectMap.get(entry.subjectId);
                            const tch = teacherMap.get(entry.teacherId);
                            const rm = roomMap.get(entry.classroomId);

                            const isKelajak =
                              entry.subjectId === 'kelajak-darsi' ||
                              sub?.name?.toLowerCase().includes('kelajak') ||
                              sub?.name?.toLowerCase().includes('kelejak');

                            if (isKelajak) {
                              return `
                              <td style="border: 1.5px solid #cbd5e1; padding: 4px 6px; text-align: center; vertical-align: middle;">
                                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 6px;">
                                  <div style="font-weight: 800; font-size: 13px; color: #1d4ed8; line-height: 1.25;">
                                    ${sub?.name || 'Kelajak darsi'}
                                  </div>
                                  <div style="font-size: 10.5px; font-weight: 600; color: #3b82f6; margin-top: 2px;">
                                    ${tch?.shortName || tch?.fullName || ''} ${rm?.roomNumber ? `<span style="background: #dbeafe; color: #1e40af; font-weight: 700; padding: 1px 4px; border-radius: 4px; font-size: 9.5px; margin-left: 2px;">${rm.roomNumber}-xona</span>` : ''}
                                  </div>
                                </div>
                              </td>
                            `;
                            }

                            return `
                            <td style="border: 1.5px solid #cbd5e1; padding: 6px 8px; text-align: center; vertical-align: middle;">
                              <div style="font-weight: 800; font-size: 13.5px; color: #0f172a; line-height: 1.25; margin-bottom: 3px;">
                                ${sub?.name || 'Dars'}
                              </div>
                              <div style="font-size: 10.5px; font-weight: 600; color: #475569;">
                                ${tch?.shortName || tch?.fullName || ''} ${rm?.roomNumber ? `<span style="background: #e2e8f0; color: #1e293b; font-weight: 700; padding: 1px 5px; border-radius: 4px; font-size: 9.5px; margin-left: 3px;">${rm.roomNumber}-xona</span>` : ''}
                              </div>
                            </td>
                          `;
                          })
                          .join('')}
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>

            <!-- FOOTER -->
            <div style="border-top: 1.5px solid #cbd5e1; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
              <div style="font-weight: 500;">
                ${isUz ? "Rasmiy maktab dars jadvali" : "Официальное школьное расписание"} • ${settings.academicYear || '2026–2027'}
              </div>
              <div style="font-weight: 600; color: #334155;">
                ${isUz ? "Tasdiqlayman: Maktab direktori" : "Утверждаю: Директор школы"} ________________________
              </div>
              <div style="font-weight: 700; color: #0f172a;">
                ${isUz ? 'Sahifa' : 'Страница'} ${pageIdx + 1} / ${totalPages}
              </div>
            </div>

          </div>
        `;
      } else if (pageItem.type === 'teacher') {
        const tch: Teacher = pageItem.data;
        const teacherEntries = schedule.entries.filter((e) => e.teacherId === tch.id);
        const totalLessons = teacherEntries.length;

        container.innerHTML = `
          <div style="width: 1400px; height: 990px; box-sizing: border-box; padding: 28px 36px 20px 36px; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; justify-content: space-between;">
            
            <!-- HEADER -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px;">
                <div>
                  <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: -0.01em;">
                    ${settings.schoolName || (isUz ? "1-SONLI UMUMIY O'RTA TA'LIM MAKTABI" : 'ГОСУДАРСТВЕННАЯ ШКОЛА № 1')}
                  </h1>
                  <div style="font-size: 13.5px; font-weight: 700; color: #475569; margin-top: 3px;">
                    ${isUz ? "O'QITUVCHI DARS JADVALI" : "ИНДИВИДУАЛЬНОЕ РАСПИСАНИЕ ПРЕПОДАВАТЕЛЯ"} • ${settings.academicYear || '2026–2027'}
                  </div>
                </div>

                <div style="text-align: right;">
                  <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 6px 22px; border-radius: 8px; font-size: 17px; font-weight: 800; letter-spacing: 0.04em;">
                    ${tch.fullName}
                  </div>
                  <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-top: 4px;">
                    ${totalLessons} ${isUz ? 'soat haftalik yuklama' : 'ч. в неделю'} • ${tch.subjectIds?.map((sid) => subjectMap.get(sid)?.shortName || subjectMap.get(sid)?.name).filter(Boolean).join(', ')}
                  </div>
                </div>
              </div>
            </div>

            <!-- MAIN TABLE -->
            <div style="flex: 1; display: flex; flex-direction: column; margin-top: 10px;">
              <table style="width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed;">
                <thead>
                  <tr style="background: #0f172a; color: #ffffff; height: 38px;">
                    <th style="width: 48px; border: 1.5px solid #0f172a; text-align: center; font-size: 13px; font-weight: 800;">№</th>
                    <th style="width: 115px; border: 1.5px solid #0f172a; text-align: center; font-size: 13px; font-weight: 800;">${isUz ? 'Vaqt' : 'Время'}</th>
                    ${settings.workingDays
                      .map(
                        (d) => `
                      <th style="border: 1.5px solid #0f172a; text-align: center; font-size: 13.5px; font-weight: 800; padding: 4px 6px;">
                        ${dayLabels[d]}
                      </th>
                    `
                      )
                      .join('')}
                  </tr>
                </thead>
                <tbody>
                  ${Array.from({ length: maxPeriod }, (_, i) => i + 1)
                    .map((p) => {
                      const timeConfig = settings.periodTimes.find((pt) => pt.period === p);
                      const timeStr = timeConfig ? `${timeConfig.startTime} – ${timeConfig.endTime}` : '';
                      const isEven = p % 2 === 0;

                      return `
                      <tr style="background: ${isEven ? '#f8fafc' : '#ffffff'};">
                        <td style="border: 1.5px solid #cbd5e1; text-align: center; font-size: 16px; font-weight: 800; color: #0f172a; background: #f1f5f9;">
                          ${p}
                        </td>
                        <td style="border: 1.5px solid #cbd5e1; text-align: center; font-size: 11.5px; font-weight: 700; color: #334155; font-family: 'SF Mono', Consolas, monospace;">
                          ${timeStr}
                        </td>
                        ${settings.workingDays
                          .map((d) => {
                            const maxP = settings.periodsPerDay[d] || 7;
                            if (p > maxP) {
                              return `<td style="border: 1.5px solid #cbd5e1; text-align: center; color: #cbd5e1; font-weight: bold;">—</td>`;
                            }

                            const entry = teacherEntries.find((e) => e.day === d && e.period === p);
                            if (!entry) {
                              return `<td style="border: 1.5px solid #cbd5e1; text-align: center; color: #e2e8f0; font-weight: bold;">—</td>`;
                            }

                            const cls = classMap.get(entry.classId);
                            const sub = subjectMap.get(entry.subjectId);
                            const rm = roomMap.get(entry.classroomId);

                            return `
                            <td style="border: 1.5px solid #cbd5e1; padding: 6px 8px; text-align: center; vertical-align: middle;">
                              <div style="display: inline-block; background: #0f172a; color: #ffffff; font-weight: 800; font-size: 11.5px; padding: 2px 8px; border-radius: 4px; margin-bottom: 3px;">
                                ${cls?.name || 'Sinf'}
                              </div>
                              <div style="font-weight: 800; font-size: 12.5px; color: #0f172a; line-height: 1.2;">
                                ${sub?.name || 'Dars'}
                              </div>
                              ${rm?.roomNumber ? `<div style="font-size: 10px; font-weight: 600; color: #64748b; margin-top: 2px;">${rm.roomNumber}-xona</div>` : ''}
                            </td>
                          `;
                          })
                          .join('')}
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>

            <!-- FOOTER -->
            <div style="border-top: 1.5px solid #cbd5e1; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
              <div style="font-weight: 500;">
                ${isUz ? "Rasmiy o'qituvchi dars jadvali" : "Официальное расписание преподавателя"} • ${settings.academicYear || '2026–2027'}
              </div>
              <div style="font-weight: 600; color: #334155;">
                ${isUz ? "Tasdiqlayman: Maktab direktori" : "Утверждаю: Директор школы"} ________________________
              </div>
              <div style="font-weight: 700; color: #0f172a;">
                ${isUz ? 'Sahifa' : 'Страница'} ${pageIdx + 1} / ${totalPages}
              </div>
            </div>

          </div>
        `;
      } else {
        // Master Summary Grid
        container.innerHTML = `
          <div style="width: 1400px; height: 990px; box-sizing: border-box; padding: 24px 32px 18px 32px; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; justify-content: space-between;">
            
            <!-- HEADER -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 10px;">
                <div>
                  <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase;">
                    ${settings.schoolName || (isUz ? "1-SONLI UMUMIY O'RTA TA'LIM MAKTABI" : 'ГОСУДАРСТВЕННАЯ ШКОЛА № 1')}
                  </h1>
                  <div style="font-size: 13px; font-weight: 700; color: #475569; margin-top: 2px;">
                    ${isUz ? 'UMUMIY MAKTAB DARS JADVALI (SVODNAYA)' : 'СВОДНОЕ РАСПИСАНИЕ УРОКОВ ПО ВСЕЙ ШКОЛЕ'} • ${settings.academicYear || '2026–2027'}
                  </div>
                </div>

                <div style="text-align: right;">
                  <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 5px 18px; border-radius: 8px; font-size: 15px; font-weight: 800;">
                    ${classes.length} ${isUz ? 'ta sinf' : 'классов'} • ${teachers.length} ${isUz ? "o'qituvchi" : 'учителей'}
                  </div>
                </div>
              </div>
            </div>

            <!-- MAIN TABLE -->
            <div style="flex: 1; display: flex; flex-direction: column; margin-top: 8px; overflow: hidden;">
              <table style="width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px;">
                <thead>
                  <tr style="background: #0f172a; color: #ffffff; height: 32px;">
                    <th style="width: 55px; border: 1px solid #0f172a; text-align: center; font-weight: 800;">${isUz ? 'Sinf' : 'Класс'}</th>
                    <th style="width: 35px; border: 1px solid #0f172a; text-align: center; font-weight: 800;">№</th>
                    ${settings.workingDays
                      .map(
                        (d) => `
                      <th style="border: 1px solid #0f172a; text-align: center; font-size: 12px; font-weight: 800; padding: 2px 4px;">
                        ${dayLabels[d]}
                      </th>
                    `
                      )
                      .join('')}
                  </tr>
                </thead>
                <tbody>
                  ${classes
                    .map((cls, cIdx) => {
                      const classEntries = schedule.entries.filter((e) => e.classId === cls.id);
                      return Array.from({ length: 6 }, (_, i) => i + 1)
                        .map((p) => {
                          const isFirstPeriod = p === 1;
                          return `
                          <tr style="background: ${cIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                            ${isFirstPeriod ? `<td rowspan="6" style="border: 1.5px solid #cbd5e1; text-align: center; font-weight: 800; font-size: 13px; background: #f1f5f9; color: #0f172a;">${cls.name}</td>` : ''}
                            <td style="border: 1px solid #cbd5e1; text-align: center; font-weight: 800; font-size: 10.5px; color: #475569;">${p}</td>
                            ${settings.workingDays
                              .map((d) => {
                                const entry = classEntries.find((e) => e.day === d && e.period === p);
                                if (!entry) return `<td style="border: 1px solid #cbd5e1; text-align: center; color: #e2e8f0;">—</td>`;
                                const sub = subjectMap.get(entry.subjectId);
                                const tch = teacherMap.get(entry.teacherId);
                                return `
                                <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: center; vertical-align: middle; line-height: 1.15;">
                                  <div style="font-weight: 700; font-size: 10px; color: #0f172a;">${sub?.shortName || sub?.name || ''}</div>
                                  <div style="font-size: 8.5px; color: #64748b;">${tch?.shortName || ''}</div>
                                </td>
                              `;
                              })
                              .join('')}
                          </tr>
                        `;
                        })
                        .join('');
                    })
                    .join('')}
                </tbody>
              </table>
            </div>

            <!-- FOOTER -->
            <div style="border-top: 1.5px solid #cbd5e1; padding-top: 6px; margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #64748b;">
              <div>${isUz ? "Umumiy maktab dars jadvali" : "Сводное расписание"} • ${settings.academicYear || '2026–2027'}</div>
              <div>${isUz ? "Tasdiqlayman: Maktab direktori" : "Утверждаю: Директор школы"} ________________________</div>
              <div>${isUz ? 'Sahifa' : 'Страница'} 1 / 1</div>
            </div>

          </div>
        `;
      }

      try {
        const canvas = await html2canvas(container, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1400,
          windowHeight: 990,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (pageIdx > 0) {
          doc.addPage('a4', 'landscape');
        }

        // A4 landscape dimensions: 297mm x 210mm
        doc.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      } catch (err) {
        console.error('Error generating PDF page:', err);
      }
    }

    document.body.removeChild(container);

    let fileName = `Dars_Jadvali_${settings.academicYear || '2026-2027'}`;
    if (options.scope === 'classes') {
      if (options.targetClassId && options.targetClassId !== 'all') {
        const targetCls = classMap.get(options.targetClassId);
        fileName = `Dars_Jadvali_${targetCls?.name || 'Sinf'}_${settings.academicYear || '2026-2027'}`;
      } else {
        fileName = `Dars_Jadvali_Barcha_Sinflar_${settings.academicYear || '2026-2027'}`;
      }
    } else if (options.scope === 'teachers') {
      if (options.targetTeacherId && options.targetTeacherId !== 'all') {
        const targetTch = teacherMap.get(options.targetTeacherId);
        fileName = `Dars_Jadvali_${targetTch?.shortName || targetTch?.fullName || 'Oqituvchi'}_${settings.academicYear || '2026-2027'}`;
      } else {
        fileName = `Dars_Jadvali_Barcha_Oqituvchilar_${settings.academicYear || '2026-2027'}`;
      }
    } else {
      fileName = `Dars_Jadvali_Svodnaya_Maktab_${settings.academicYear || '2026-2027'}`;
    }

    doc.save(`${fileName}.pdf`);
  },

  /**
   * Exports CSV
   */
  exportToCSV: (
    schedule: Schedule,
    teachers: Teacher[],
    classes: SchoolClass[],
    subjects: Subject[],
    rooms: Classroom[],
    language: 'ru' | 'uz' = 'ru'
  ) => {
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const isUz = language === 'uz';
    const dayLabels = isUz ? UZ_DAY_NAMES : DAY_NAMES;

    const header = isUz
      ? ['Kun', 'Dars', 'Sinf', 'Fan', "O'qituvchi", 'Xona']
      : ['День', 'Урок', 'Класс', 'Предмет', 'Учитель', 'Кабинет'];

    const rows = schedule.entries.map((e) => [
      dayLabels[e.day] || `Kun ${e.day}`,
      e.period,
      classMap.get(e.classId)?.name || e.classId,
      subjectMap.get(e.subjectId)?.name || e.subjectId,
      teacherMap.get(e.teacherId)?.fullName || e.teacherId,
      roomMap.get(e.classroomId)?.roomNumber || e.classroomId,
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Dars_Jadvali_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * System print helper
   */
  triggerPrint: () => {
    window.print();
  },
};
